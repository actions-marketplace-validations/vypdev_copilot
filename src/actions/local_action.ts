








import { GitCliRepository } from '../data/repository/git_cli_repository';
import { createProjectBoardCompositionRoot } from '../infrastructure/composition/project_board_composition_root';

import { mainRun } from './common_action';
import { renderLocalActionResults } from './local_action_output';
import { buildLocalActionConfiguration } from './local_action_configuration';
import { buildLocalActionExecution } from './local_action_execution';

export async function runLocalAction(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Params shape is dynamic (CLI/action inputs)
    additionalParams: any
): Promise<void> {
    const projectRepository = createProjectBoardCompositionRoot();

    const configuration = await buildLocalActionConfiguration(additionalParams, projectRepository);
    const execution = buildLocalActionExecution(configuration, additionalParams);

    const results = await mainRun(execution, projectRepository, new GitCliRepository());

    renderLocalActionResults(results);
}
