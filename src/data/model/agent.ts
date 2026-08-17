export type AgentProvider = 'opencode' | 'codex' | 'cursor';
export type AgentTransport = 'server' | 'cli';
export type AgentTask = 'findings' | 'fixer';

export interface AgentConfiguration {
    provider: AgentProvider;
    transport: AgentTransport;
    model: string;
    serverUrl?: string;
    command?: string;
}

export interface AgentTaskConfiguration {
    findings: AgentConfiguration;
    fixer: AgentConfiguration;
}

export function isAgentConfigurationReady(configuration: AgentConfiguration | undefined): boolean {
    if (!configuration?.model.trim()) return false;
    if (configuration.transport === 'server') return Boolean(configuration.serverUrl?.trim());
    return Boolean(configuration.command?.trim());
}
