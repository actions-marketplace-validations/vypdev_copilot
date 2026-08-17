import { BranchRepository } from '../repository/branch_repository';
import type { Execution } from './execution';
import { resolveHotfixBranchVersion } from './resolve_hotfix_branch_version';
import { resolveReleaseBranchVersion } from './resolve_release_branch_version';
import type { IssueDescriptionQueryPort } from '../../application/ports/issue_ports';

export async function resolveIssueBranchVersion(
    execution: Execution,
    branchRepository: BranchRepository,
    issueDescriptionPort: IssueDescriptionQueryPort,
): Promise<boolean> {
    if (execution.release.active && execution.release.version === undefined) {
        return resolveReleaseBranchVersion(execution, branchRepository, issueDescriptionPort);
    }

    if (execution.hotfix.active && execution.hotfix.version === undefined) {
        return resolveHotfixBranchVersion(execution, branchRepository, issueDescriptionPort);
    }

    return true;
}
