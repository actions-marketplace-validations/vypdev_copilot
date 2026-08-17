import type { Execution } from '../../../../../data/model/execution';
import type { FindingsQueryPort } from '../../../../../data/repository/agent_ports';
import { OPENCODE_AGENT_PLAN } from '../../../../../data/repository/agent_task_policy';
import { BUGBOT_RESPONSE_SCHEMA } from './schema';

export async function queryBugbotFindings(
    repository: FindingsQueryPort,
    execution: Execution,
    prompt: string,
): Promise<unknown> {
    return repository.askAgent(execution.ai, OPENCODE_AGENT_PLAN, prompt, {
        expectJson: true,
        schema: BUGBOT_RESPONSE_SCHEMA as unknown as Record<string, unknown>,
        schemaName: 'bugbot_findings',
    });
}
