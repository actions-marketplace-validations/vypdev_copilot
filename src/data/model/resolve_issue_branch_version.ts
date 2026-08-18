import type { LatestTagQueryPort } from '../../application/ports/branch_ports';
import type { Execution } from './execution';
import { resolveHotfixBranchVersion } from './resolve_hotfix_branch_version';
import { resolveReleaseBranchVersion } from './resolve_release_branch_version';
import type { IssueDescriptionQueryPort } from '../../application/ports/issue_description_ports';

export async function resolveIssueBranchVersion(
    execution: Execution,
    branchRepository: LatestTagQueryPort,
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
