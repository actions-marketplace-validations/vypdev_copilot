export interface AgentConfiguration {
    provider: 'opencode' | 'codex' | 'cursor';
    transport: 'server' | 'cli';
    model: string;
    serverUrl?: string;
    command?: string;
}
