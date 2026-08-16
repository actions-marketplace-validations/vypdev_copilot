import type { AgentProvider, AgentTaskConfiguration, AgentTransport } from '../data/model/agent';

export interface AgentTaskConfigurationValues {
    provider: string;
    transport: string;
    model: string;
    serverUrl?: string;
    command?: string;
}

const PROVIDERS: readonly AgentProvider[] = ['opencode', 'cursor', 'codex'];
const TRANSPORTS: readonly AgentTransport[] = ['server', 'cli'];
const DEFAULT_COMMANDS: Readonly<Record<AgentProvider, string>> = {
    opencode: 'opencode',
    cursor: 'cursor-agent',
    codex: 'codex',
};

function resolveProvider(value: string): AgentProvider {
    if (PROVIDERS.includes(value as AgentProvider)) return value as AgentProvider;
    throw new Error(`Unsupported agent provider "${value}". Supported providers: ${PROVIDERS.join(', ')}.`);
}

function resolveTransport(value: string): AgentTransport {
    if (TRANSPORTS.includes(value as AgentTransport)) return value as AgentTransport;
    throw new Error(`Unsupported agent transport "${value}". Supported transports: ${TRANSPORTS.join(', ')}.`);
}

export function buildAgentTasks(values: AgentTaskConfigurationValues): AgentTaskConfiguration {
    const provider = resolveProvider(values.provider.trim().toLowerCase());
    const transport = resolveTransport(values.transport.trim().toLowerCase());
    const model = values.model.trim();
    if (!model) throw new Error('Agent model must not be empty.');
    const serverUrl = values.serverUrl?.trim();
    const command = values.command?.trim() || DEFAULT_COMMANDS[provider];
    if (transport === 'server' && provider !== 'opencode') {
        throw new Error(`Agent server transport is only supported by opencode. Use cli for ${provider}.`);
    }
    if (transport === 'server' && !serverUrl) throw new Error('Agent server transport requires a server URL.');

    const configuration = {
        provider,
        transport,
        model,
        ...(serverUrl ? { serverUrl } : {}),
        ...(transport === 'cli' ? { command } : {}),
    };
    return { findings: configuration, fixer: configuration };
}
