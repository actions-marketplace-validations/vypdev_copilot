








import { RepositoryFactory } from '../infrastructure/composition/repository_factory';

import { mainRun } from './common_action';
import { renderLocalActionResults } from './local_action_output';
import { buildLocalActionConfiguration } from './local_action_configuration';
import { buildLocalActionExecution } from './local_action_execution';

export async function runLocalAction(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Params shape is dynamic (CLI/action inputs)
    additionalParams: any
): Promise<void> {
    const repositoryFactory = new RepositoryFactory();
    const projectRepository = repositoryFactory.createProjectBoardRepository();

    const configuration = await buildLocalActionConfiguration(additionalParams, projectRepository);
    const execution = buildLocalActionExecution(configuration, additionalParams);

    const results = await mainRun(execution, projectRepository, repositoryFactory.createGitCliRepository());

    renderLocalActionResults(results);
}
