import type { AgentTask, AgentTaskConfiguration } from '../model/agent';

export function getValidatedAgentConfiguration(
    configuration: AgentTaskConfiguration[AgentTask],
    task: AgentTask,
): AgentTaskConfiguration[AgentTask] {
    if (configuration.transport === 'server' && configuration.provider !== 'opencode') {
        throw new Error(`Agent server transport is not implemented for ${configuration.provider}. Use cli.`);
    }
    if (configuration.transport === 'cli' && !configuration.command?.trim()) {
        throw new Error(`Agent CLI command is required for ${configuration.provider} ${task}.`);
    }
    return configuration;
}
