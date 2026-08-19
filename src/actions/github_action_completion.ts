import * as core from '@actions/core';
import type { Execution } from '../data/model/execution';
import type { Result } from '../data/model/result';
import type { IssueContentRepository } from '../data/repository/issue/issue_content_repository';
import { PublishResultUseCase } from '../application/usecases/steps/common/publish_resume_use_case';
import { StoreConfigurationUseCase } from '../application/usecases/steps/common/store_configuration_use_case';
import { ConfigurationHandler } from '../manager/description/configuration_handler';
import { logInfo } from '../utils/logger';

export async function finishGithubAction(
    execution: Execution,
    results: Result[],
    issueNotificationPort: ConstructorParameters<typeof PublishResultUseCase>[0],
    issueDescriptionPort: IssueContentRepository,
): Promise<void> {
    const stepCount = results.reduce((acc, result) => acc + (result.steps?.length ?? 0), 0);
    const errorCount = results.reduce((acc, result) => acc + (result.errors?.length ?? 0), 0);
    logInfo(`Publishing result: ${results.length} result(s), ${stepCount} step(s), ${errorCount} error(s).`);

    execution.currentConfiguration.results = results;
    await new PublishResultUseCase(issueNotificationPort).invoke(execution);
    await new StoreConfigurationUseCase(new ConfigurationHandler(issueDescriptionPort)).invoke(execution);
    logInfo('Configuration stored. Finishing.');

    if (execution.isSingleAction && execution.singleAction.throwError) {
        setFirstErrorIfExists(results);
    }
}

function setFirstErrorIfExists(results: Result[]): void {
    for (const result of results) {
        if (result.errors && result.errors.length > 0) {
            core.setFailed(result.errors[0]);
            return;
        }
    }
}
