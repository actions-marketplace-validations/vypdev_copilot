import { nextReleaseVersion } from './version_resolution_policy';
import { applyReleaseResolution } from './version_resolution_application_policy';
import { releaseResolutionFromPayload } from './version_resolution_result_policy';
import { shouldAbortReleaseResolution } from './version_resolution_outcome_policy';
import type { LatestTagQueryPort } from '../../application/ports/branch_ports';
import type { Execution } from './execution';
import { GetReleaseTypeUseCase } from '../../application/usecases/steps/common/get_release_type_use_case';
import { GetReleaseVersionUseCase } from '../../application/usecases/steps/common/get_release_version_use_case';
import type { IssueDescriptionQueryPort } from '../../application/ports/issue_ports';

export async function resolveReleaseBranchVersion(
    execution: Execution,
    branchRepository: LatestTagQueryPort,
    issueDescriptionPort: IssueDescriptionQueryPort,
): Promise<boolean> {
    const versionResult = await new GetReleaseVersionUseCase(issueDescriptionPort).invoke(execution);
    const versionInfo = versionResult.at(-1);
    if (versionInfo?.executed && versionInfo.success) {
        execution.release.version = releaseResolutionFromPayload(versionInfo.payload).version;
    } else {
        const typeResult = await new GetReleaseTypeUseCase(issueDescriptionPort).invoke(execution);
        const typeInfo = typeResult.at(-1);
        if (typeInfo?.executed && typeInfo.success) {
            execution.release.type = releaseResolutionFromPayload(typeInfo.payload).type;
            if (shouldAbortReleaseResolution(execution.release.type)) return false;
            execution.release.version = nextReleaseVersion(
                await branchRepository.getLatestTag(),
                execution.release.type!,
            );
        }
    }
    execution.release.branch = applyReleaseResolution(
        execution.branches.releaseTree,
        execution.release.version,
    ).branch;
    return true;
}
