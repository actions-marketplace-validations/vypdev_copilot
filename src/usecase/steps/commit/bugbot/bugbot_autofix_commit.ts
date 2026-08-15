/**
 * Runs verify commands and then git add/commit/push for bugbot autofix.
 * Uses @actions/exec; intended to run in the GitHub Action runner where the repo is checked out.
 * Configures git user.name and user.email from the token user so the commit has a valid author.
 */

import * as exec from "@actions/exec";
import { ProjectRepository } from "../../../../data/repository/project_repository";
import { checkoutBranch } from "./git_branch_checkout";
import { logDebugInfo, logError, logInfo } from "../../../../utils/logger";
import type { Execution } from "../../../../data/model/execution";
import {
    MAX_VERIFY_COMMANDS,
    limitVerifyCommands,
    parseVerifyCommand,
} from "./verify_command_policy";

/** Max length per finding ID in commit message (avoids injection and overflow). */
const MAX_FINDING_ID_LENGTH_COMMIT = 80;

/** Max total length of the finding IDs portion in the commit message. */
const MAX_FINDING_IDS_PART_LENGTH = 500;

/**
 * Sanitizes a finding ID for safe inclusion in a git commit message.
 * Strips newlines, control chars, and limits length to avoid log injection and unexpected behavior.
 */
function sanitizeFindingIdForCommitMessage(id: string): string {
    const withoutNewlines = String(id).replace(/\r\n|\r|\n/g, " ");
    const withoutControlChars = withoutNewlines.replace(/[\s\S]/g, (c) => {
        const code = c.charCodeAt(0);
        if (code < 32 && code !== 9) return ""; // keep tab, drop other C0 controls
        if (code === 127) return ""; // DEL
        return c;
    });
    const trimmed = withoutControlChars.trim();
    return trimmed.length <= MAX_FINDING_ID_LENGTH_COMMIT
        ? trimmed
        : trimmed.slice(0, MAX_FINDING_ID_LENGTH_COMMIT);
}

/**
 * Builds the sanitized finding IDs part for the bugbot autofix commit message.
 */
function buildFindingIdsPartForCommit(targetFindingIds: string[]): string {
    if (targetFindingIds.length === 0) return "reported findings";
    const sanitized = targetFindingIds.map(sanitizeFindingIdForCommitMessage).filter(Boolean);
    if (sanitized.length === 0) return "reported findings";
    const part = sanitized.join(", ");
    if (part.length <= MAX_FINDING_IDS_PART_LENGTH) return part;
    return part.slice(0, MAX_FINDING_IDS_PART_LENGTH - 3) + "...";
}

export interface BugbotAutofixCommitResult {
    success: boolean;
    committed: boolean;
    error?: string;
}


/**
 * Runs verify commands in order. Returns true if all pass.
 * Commands are parsed with shell-quote (quotes supported); shell operators are not allowed.
 */
async function runVerifyCommands(
    commands: string[]
): Promise<{ success: boolean; failedCommand?: string; error?: string }> {
    for (const cmd of commands) {
        const parsed = parseVerifyCommand(cmd);
        if (!parsed) {
            const msg = `Invalid verify command (use no shell operators; quotes allowed): ${cmd}`;
            logError(msg);
            return { success: false, failedCommand: cmd, error: msg };
        }
        const { program, args } = parsed;
        try {
            const code = await exec.exec(program, args);
            if (code !== 0) {
                return { success: false, failedCommand: cmd };
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            logError(`Verify command failed: ${cmd} - ${msg}`);
            return { success: false, failedCommand: cmd };
        }
    }
    return { success: true };
}

/** Returns true if there are uncommitted changes in the working tree or index. */
async function hasChanges(): Promise<boolean> {
    let output = "";
    await exec.exec("git", ["status", "--porcelain"], {
        listeners: {
            stdout: (data: Buffer) => {
                output += data.toString();
            },
        },
    });
    return output.trim().length > 0;
}

/**
 * Runs verify commands (if configured), then git add, commit, and push.
 * When branchOverride is set, checks out that branch first (e.g. for issue_comment events).
 */
export async function runBugbotAutofixCommitAndPush(
    execution: Execution,
    options?: { branchOverride?: string; targetFindingIds?: string[]; workspacePaths?: string[] }
): Promise<BugbotAutofixCommitResult> {
    const branchOverride = options?.branchOverride;
    const targetFindingIds = options?.targetFindingIds ?? [];
    const branch = branchOverride ?? execution.commit.branch;

    if (!branch?.trim()) {
        return { success: false, committed: false, error: "No branch to commit to." };
    }

    if (branchOverride) {
        const ok = await checkoutBranch(branch);
        if (!ok) {
            return { success: false, committed: false, error: `Failed to checkout branch ${branch}.` };
        }
    }

    const configuredVerifyCommands = execution.ai?.getBugbotFixVerifyCommands?.() ?? [];
    const verifyCommands = limitVerifyCommands(Array.isArray(configuredVerifyCommands) ? configuredVerifyCommands : []);
    if (Array.isArray(configuredVerifyCommands) && configuredVerifyCommands.length > MAX_VERIFY_COMMANDS) {
        logInfo(
            `Limiting verify commands to ${MAX_VERIFY_COMMANDS} (configured: ${configuredVerifyCommands.length}).`
        );
    }
    if (verifyCommands.length > 0) {
        logInfo(`Running ${verifyCommands.length} verify command(s)...`);
        const verify = await runVerifyCommands(verifyCommands);
        if (!verify.success) {
            return {
                success: false,
                committed: false,
                error: verify.error ?? `Verify command failed: ${verify.failedCommand ?? "unknown"}.`,
            };
        }
    }

    const changed = await hasChanges();
    if (!changed) {
        logDebugInfo("No changes to commit after autofix.");
        return { success: true, committed: false };
    }

    try {
        const projectRepository = new ProjectRepository();
        const { name, email } = await projectRepository.getTokenUserDetails(execution.tokens.token);
        await exec.exec("git", ["config", "user.name", name]);
        await exec.exec("git", ["config", "user.email", email]);
        logDebugInfo(`Git author set to ${name} <${email}>.`);

        if (options?.workspacePaths) {
            if (options.workspacePaths.length === 0) {
                return { success: false, committed: false, error: "No safe workspace paths to commit." };
            }
            await exec.exec("git", ["add", "--", ...options.workspacePaths]);
        } else {
            await exec.exec("git", ["add", "-A"]);
        }
        const issueNumber = execution.issueNumber > 0 ? execution.issueNumber : undefined;
        const findingIdsPart = buildFindingIdsPartForCommit(targetFindingIds);
        const commitMessage = issueNumber
            ? `fix(#${issueNumber}): bugbot autofix - resolve ${findingIdsPart}`
            : `fix: bugbot autofix - resolve ${findingIdsPart}`;
        await exec.exec("git", ["commit", "-m", commitMessage]);
        await exec.exec("git", ["push", "origin", branch]);
        logInfo(`Pushed commit to origin/${branch}.`);
        return { success: true, committed: true };
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logError(`Commit or push failed: ${msg}`);
        return { success: false, committed: false, error: msg };
    }
}

/**
 * Runs verify commands (if configured), then git add, commit, and push for a generic user request.
 * Same flow as runBugbotAutofixCommitAndPush but with a generic commit message.
 * When branchOverride is set, checks out that branch first.
 */
export async function runUserRequestCommitAndPush(
    execution: Execution,
    options?: { branchOverride?: string }
): Promise<BugbotAutofixCommitResult> {
    const branchOverride = options?.branchOverride;
    const branch = branchOverride ?? execution.commit.branch;

    if (!branch?.trim()) {
        return { success: false, committed: false, error: "No branch to commit to." };
    }

    if (branchOverride) {
        const ok = await checkoutBranch(branch);
        if (!ok) {
            return { success: false, committed: false, error: `Failed to checkout branch ${branch}.` };
        }
    }

    const configuredVerifyCommands = execution.ai?.getBugbotFixVerifyCommands?.() ?? [];
    const verifyCommands = limitVerifyCommands(Array.isArray(configuredVerifyCommands) ? configuredVerifyCommands : []);
    if (Array.isArray(configuredVerifyCommands) && configuredVerifyCommands.length > MAX_VERIFY_COMMANDS) {
        logInfo(
            `Limiting verify commands to ${MAX_VERIFY_COMMANDS} (configured: ${configuredVerifyCommands.length}).`
        );
    }
    if (verifyCommands.length > 0) {
        logInfo(`Running ${verifyCommands.length} verify command(s)...`);
        const verify = await runVerifyCommands(verifyCommands);
        if (!verify.success) {
            return {
                success: false,
                committed: false,
                error: verify.error ?? `Verify command failed: ${verify.failedCommand ?? "unknown"}.`,
            };
        }
    }

    const changed = await hasChanges();
    if (!changed) {
        logDebugInfo("No changes to commit after user request.");
        return { success: true, committed: false };
    }

    try {
        const projectRepository = new ProjectRepository();
        const { name, email } = await projectRepository.getTokenUserDetails(execution.tokens.token);
        await exec.exec("git", ["config", "user.name", name]);
        await exec.exec("git", ["config", "user.email", email]);
        logDebugInfo(`Git author set to ${name} <${email}>.`);

        await exec.exec("git", ["add", "-A"]);
        const issueNumber = execution.issueNumber > 0 ? execution.issueNumber : undefined;
        const commitMessage = issueNumber
            ? `chore(#${issueNumber}): apply user request`
            : "chore: apply user request";
        await exec.exec("git", ["commit", "-m", commitMessage]);
        await exec.exec("git", ["push", "origin", branch]);
        logInfo(`Pushed commit to origin/${branch}.`);
        return { success: true, committed: true };
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logError(`Commit or push failed: ${msg}`);
        return { success: false, committed: false, error: msg };
    }
}
