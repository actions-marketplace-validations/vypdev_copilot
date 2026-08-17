import * as exec from '@actions/exec';
import type { AuthenticatedUserPort } from '../../../../../application/ports/organization_ports';
import type { Execution } from '../../../../../data/model/execution';
import { logDebugInfo, logError, logInfo } from '../../../../../utils/logger';
import { checkoutBranch } from './git_branch_checkout';
import { MAX_VERIFY_COMMANDS, limitVerifyCommands } from './verify_command_policy';
import { runVerifyCommands } from './verify_command_runner';
import { hasWorkspaceChanges } from './workspace_changes';
import { GitCommitRepository } from './git_commit_repository';

export interface CommitAndPushWorkflowResult {
    success: boolean;
    committed: boolean;
    error?: string;
}

export interface CommitAndPushWorkflowOptions {
    branch: string;
    commitMessage: string;
    branchOverride?: boolean;
    workspacePaths?: string[];
    noChangesMessage: string;
}

const gitCommitRepository = new GitCommitRepository({
    execute: (program, args) => exec.exec(program, args),
});

export async function runCommitAndPushWorkflow(
    execution: Execution,
    options: CommitAndPushWorkflowOptions,
    authenticatedUserPort: AuthenticatedUserPort,
): Promise<CommitAndPushWorkflowResult> {
    if (!options.branch?.trim()) {
        return { success: false, committed: false, error: 'No branch to commit to.' };
    }

    if (options.branchOverride && !(await checkoutBranch(options.branch))) {
        return {
            success: false,
            committed: false,
            error: `Failed to checkout branch ${options.branch}.`,
        };
    }

    const configured = execution.ai?.getBugbotFixVerifyCommands?.() ?? [];
    const verifyCommands = limitVerifyCommands(Array.isArray(configured) ? configured : []);
    if (Array.isArray(configured) && configured.length > MAX_VERIFY_COMMANDS) {
        logInfo(`Limiting verify commands to ${MAX_VERIFY_COMMANDS} (configured: ${configured.length}).`);
    }
    if (verifyCommands.length > 0) {
        logInfo(`Running ${verifyCommands.length} verify command(s)...`);
        const verify = await runVerifyCommands(verifyCommands, (program, args) => exec.exec(program, args));
        if (!verify.success) {
            return {
                success: false,
                committed: false,
                error: verify.error ?? `Verify command failed: ${verify.failedCommand ?? 'unknown'}.`,
            };
        }
    }

    if (!(await hasWorkspaceChanges())) {
        logDebugInfo(options.noChangesMessage);
        return { success: true, committed: false };
    }

    if (options.workspacePaths && options.workspacePaths.length === 0) {
        return { success: false, committed: false, error: 'No safe workspace paths to commit.' };
    }

    try {
        const { name, email } = await authenticatedUserPort.getTokenUserDetails(execution.tokens.token);
        await gitCommitRepository.configureAuthor(name, email);
        logDebugInfo(`Git author set to ${name} <${email}>.`);
        if (options.workspacePaths) {
            await gitCommitRepository.stagePaths(options.workspacePaths);
        } else {
            await gitCommitRepository.stageAll();
        }
        await gitCommitRepository.commit(options.commitMessage);
        await gitCommitRepository.push(options.branch);
        logInfo(`Pushed commit to origin/${options.branch}.`);
        return { success: true, committed: true };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logError(`Commit or push failed: ${message}`);
        return { success: false, committed: false, error: message };
    }
}
