import { BranchRepository } from '../repository/branch_repository';
import type { Execution } from './execution';
import { resolveHotfixBranchVersion } from './resolve_hotfix_branch_version';
import { resolveReleaseBranchVersion } from './resolve_release_branch_version';

export async function resolveIssueBranchVersion(
    execution: Execution,
    branchRepository: BranchRepository,
): Promise<boolean> {
    if (execution.release.active && execution.release.version === undefined) {
        return resolveReleaseBranchVersion(execution, branchRepository);
    }

    if (execution.hotfix.active && execution.hotfix.version === undefined) {
        return resolveHotfixBranchVersion(execution, branchRepository);
    }

    return true;
}
