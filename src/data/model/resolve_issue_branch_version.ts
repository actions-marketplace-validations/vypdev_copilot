import { nextHotfixVersion, nextReleaseVersion } from './version_resolution_policy';
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
            execution.release.version = versionInfo.payload['releaseVersion'];
        } else {
            const typeResult = await new GetReleaseTypeUseCase().invoke(execution);
            const typeInfo = typeResult.at(-1);
            if (typeInfo?.executed && typeInfo.success) {
                execution.release.type = typeInfo.payload['releaseType'];
                if (execution.release.type === undefined) return false;
                const lastTag = await branchRepository.getLatestTag();
                execution.release.version = nextReleaseVersion(lastTag, execution.release.type);
            }
        }
        execution.release.branch = `${execution.branches.releaseTree}/${execution.release.version}`;
    } else if (execution.hotfix.active && execution.hotfix.version === undefined) {
        const versionResult = await new GetHotfixVersionUseCase().invoke(execution);
        const versionInfo = versionResult.at(-1);
        if (versionInfo?.executed && versionInfo.success) {
            execution.hotfix.baseVersion = versionInfo.payload['baseVersion'];
            execution.hotfix.version = versionInfo.payload['hotfixVersion'];
        } else {
            const latestTag = await branchRepository.getLatestTag();
            const nextVersion = nextHotfixVersion(latestTag);
            execution.hotfix.baseVersion = nextVersion.baseVersion;
            execution.hotfix.version = nextVersion.version;
        }
        execution.hotfix.branch = `${execution.branches.hotfixTree}/${execution.hotfix.version}`;
        execution.currentConfiguration.hotfixBranch = execution.hotfix.branch;
        execution.hotfix.baseBranch = `tags/v${execution.hotfix.baseVersion}`;
        execution.currentConfiguration.hotfixOriginBranch = execution.hotfix.baseBranch;
    }
    return true;
}
