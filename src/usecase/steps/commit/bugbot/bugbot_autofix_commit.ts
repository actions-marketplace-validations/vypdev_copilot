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
} from "./verify_command_policy";
import {
    buildBugbotCommitMessage,
    buildUserRequestCommitMessage,
} from "./commit_message_policy";
import { runVerifyCommands } from "./verify_command_runner";

export interface BugbotAutofixCommitResult {
    success: boolean;
    committed: boolean;
    error?: string;
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
        const verify = await runVerifyCommands(verifyCommands, (program, args) => exec.exec(program, args));
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
        const commitMessage = buildBugbotCommitMessage(execution.issueNumber, targetFindingIds);
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
        const verify = await runVerifyCommands(verifyCommands, (program, args) => exec.exec(program, args));
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
        const commitMessage = buildUserRequestCommitMessage(execution.issueNumber);
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
