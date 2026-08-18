import { nextHotfixVersion } from './version_resolution_policy';
import { applyHotfixResolution } from './version_resolution_application_policy';
import { hotfixResolutionFromPayload } from './version_resolution_result_policy';
import type { LatestTagQueryPort } from '../../application/ports/branch_tag_ports';
import type { Execution } from './execution';
import { GetHotfixVersionUseCase } from '../../application/usecases/steps/common/get_hotfix_version_use_case';
import type { IssueDescriptionQueryPort } from '../../application/ports/issue_description_ports';

export async function resolveHotfixBranchVersion(
    execution: Execution,
    branchRepository: LatestTagQueryPort,
    issueDescriptionPort: IssueDescriptionQueryPort,
): Promise<boolean> {
    const versionResult = await new GetHotfixVersionUseCase(issueDescriptionPort).invoke(execution);
    const versionInfo = versionResult.at(-1);
    if (versionInfo?.executed && versionInfo.success) {
        const resolution = hotfixResolutionFromPayload(versionInfo.payload);
        execution.hotfix.baseVersion = resolution.baseVersion;
        execution.hotfix.version = resolution.version;
    } else {
        const nextVersion = nextHotfixVersion(await branchRepository.getLatestTag());
        execution.hotfix.baseVersion = nextVersion.baseVersion;
        execution.hotfix.version = nextVersion.version;
    }
    const state = applyHotfixResolution(
        execution.branches.hotfixTree,
        execution.hotfix.baseVersion,
        execution.hotfix.version,
    );
    execution.hotfix.branch = state.branch;
    execution.currentConfiguration.hotfixBranch = state.branch;
    execution.hotfix.baseBranch = state.baseBranch;
    execution.currentConfiguration.hotfixOriginBranch = state.baseBranch;
    return true;
}
