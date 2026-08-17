import { INPUT_KEYS, OPENCODE_DEFAULT_MODEL } from '../utils/constants';
import { buildAgentTasks } from './agent_configuration_builder';

export type AgentInputReader = (key: string) => string | undefined;

export function buildAgentTasksFromInputs(read: AgentInputReader) {
    const opencodeServerUrl = read(INPUT_KEYS.OPENCODE_SERVER_URL)?.trim() || 'http://127.0.0.1:4096';
    const opencodeModel = read(INPUT_KEYS.OPENCODE_MODEL)?.trim() || OPENCODE_DEFAULT_MODEL;
    const provider = read(INPUT_KEYS.AGENT_PROVIDER)?.trim() || 'opencode';
    const transport = read(INPUT_KEYS.AGENT_TRANSPORT)?.trim() || 'server';
    const model = read(INPUT_KEYS.AGENT_MODEL)?.trim() || opencodeModel;
    const command = read(INPUT_KEYS.AGENT_COMMAND) ?? '';
    return buildAgentTasks({
        provider,
        transport,
        model,
        serverUrl: opencodeServerUrl,
        command,
        findings: {
            provider: read(INPUT_KEYS.FINDINGS_PROVIDER),
            transport: read(INPUT_KEYS.FINDINGS_TRANSPORT),
            model: read(INPUT_KEYS.FINDINGS_MODEL),
            command: read(INPUT_KEYS.FINDINGS_COMMAND),
        },
        fixer: {
            provider: read(INPUT_KEYS.FIXER_PROVIDER),
            transport: read(INPUT_KEYS.FIXER_TRANSPORT),
            model: read(INPUT_KEYS.FIXER_MODEL),
            command: read(INPUT_KEYS.FIXER_COMMAND),
        },
    });
}

export function buildAgentTasksFromValues(values: Record<string, unknown>) {
    return buildAgentTasksFromInputs((key) => {
        const value = values[key];
        return value == null ? undefined : String(value);
    });
}
