import { nextHotfixVersion, nextReleaseVersion } from './version_resolution_policy';
import { applyHotfixResolution, applyReleaseResolution } from './version_resolution_application_policy';
import { hotfixResolutionFromPayload, releaseResolutionFromPayload } from './version_resolution_result_policy';
import { shouldAbortReleaseResolution } from './version_resolution_outcome_policy';
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
                if (shouldAbortReleaseResolution(execution.release.type)) return false;
                const lastTag = await branchRepository.getLatestTag();
                execution.release.version = nextReleaseVersion(lastTag, execution.release.type!);
            }
        }
        const releaseState = applyReleaseResolution(execution.branches.releaseTree, execution.release.version);
        execution.release.branch = releaseState.branch;
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
        const hotfixState = applyHotfixResolution(
            execution.branches.hotfixTree,
            execution.hotfix.baseVersion,
            execution.hotfix.version,
        );
        execution.hotfix.branch = hotfixState.branch;
        execution.currentConfiguration.hotfixBranch = hotfixState.branch;
        execution.hotfix.baseBranch = hotfixState.baseBranch;
        execution.currentConfiguration.hotfixOriginBranch = hotfixState.baseBranch;
    }
    return true;
}
