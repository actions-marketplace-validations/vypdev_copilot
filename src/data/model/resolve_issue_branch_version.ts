import { nextHotfixVersion, nextReleaseVersion } from './version_resolution_policy';
import { hotfixBranch, hotfixOriginBranch, releaseBranch } from './branch_state_policy';
import { hotfixResolutionFromPayload, releaseResolutionFromPayload } from './version_resolution_result_policy';
import { BranchRepository } from '../repository/branch_repository';
import type { Execution } from './execution';
import { GetHotfixVersionUseCase } from '../../usecase/steps/common/get_hotfix_version_use_case';
import { GetReleaseTypeUseCase } from '../../usecase/steps/common/get_release_type_use_case';
import { GetReleaseVersionUseCase } from '../../usecase/steps/common/get_release_version_use_case';

function lastResult<T>(results: T[]): T | undefined {
    return results.at(-1);
}

export async function resolveIssueBranchVersion(
    execution: Execution,
    branchRepository: BranchRepository,
): Promise<boolean> {
    if (execution.release.active && execution.release.version === undefined) {
        const versionResult = await new GetReleaseVersionUseCase().invoke(execution);
        const versionInfo = lastResult(versionResult);
        if (versionInfo?.executed && versionInfo.success) {
            const releaseResolution = releaseResolutionFromPayload(versionInfo.payload);
            execution.release.version = releaseResolution.version;
        } else {
            const typeResult = await new GetReleaseTypeUseCase().invoke(execution);
            const typeInfo = typeResult.at(-1);
            if (typeInfo?.executed && typeInfo.success) {
                const releaseResolution = releaseResolutionFromPayload(typeInfo.payload);
                execution.release.type = releaseResolution.type;
                if (execution.release.type === undefined) return false;
                const lastTag = await branchRepository.getLatestTag();
                execution.release.version = nextReleaseVersion(lastTag, execution.release.type);
            }
        }
        execution.release.branch = releaseBranch(execution.branches.releaseTree, execution.release.version);
    } else if (execution.hotfix.active && execution.hotfix.version === undefined) {
        const versionResult = await new GetHotfixVersionUseCase().invoke(execution);
        const versionInfo = versionResult.at(-1);
        if (versionInfo?.executed && versionInfo.success) {
            const hotfixResolution = hotfixResolutionFromPayload(versionInfo.payload);
            execution.hotfix.baseVersion = hotfixResolution.baseVersion;
            execution.hotfix.version = hotfixResolution.version;
        } else {
            const latestTag = await branchRepository.getLatestTag();
            const nextVersion = nextHotfixVersion(latestTag);
            execution.hotfix.baseVersion = nextVersion.baseVersion;
            execution.hotfix.version = nextVersion.version;
        }
        execution.hotfix.branch = hotfixBranch(execution.branches.hotfixTree, execution.hotfix.version);
        execution.currentConfiguration.hotfixBranch = execution.hotfix.branch;
        execution.hotfix.baseBranch = hotfixOriginBranch(execution.hotfix.baseVersion ?? '');
        execution.currentConfiguration.hotfixOriginBranch = execution.hotfix.baseBranch;
    }
    return true;
}
