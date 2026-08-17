import type { AgentConfiguration } from '../model/agent';

export type AgentCredentialStatus = 'available' | 'missing' | 'not_required';

export interface AgentAuthenticationCheck {
    status: AgentCredentialStatus;
    variables: readonly string[];
    message: string;
}

const CLI_CREDENTIALS: Readonly<Record<AgentConfiguration['provider'], readonly string[]>> = {
    opencode: ['OPENCODE_API_KEY', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'GOOGLE_API_KEY'],
    cursor: ['CURSOR_API_KEY'],
    codex: ['CODEX_ACCESS_TOKEN', 'OPENAI_API_KEY'],
};

function hasValue(environment: NodeJS.ProcessEnv, variable: string): boolean {
    return Boolean(environment[variable]?.trim());
}

export function checkAgentAuthentication(
    configuration: AgentConfiguration,
    environment: NodeJS.ProcessEnv = process.env
): AgentAuthenticationCheck {
    if (configuration.transport === 'server') {
        return {
            status: 'not_required',
            variables: [],
            message: 'Server transport delegates authentication to the configured agent server.',
        };
    }

    const variables = CLI_CREDENTIALS[configuration.provider];
    if (variables.some((variable) => hasValue(environment, variable))) {
        return {
            status: 'available',
            variables,
            message: `Local credentials available for ${configuration.provider}.`,
        };
    }

    return {
        status: 'missing',
        variables,
        message: `No local credentials found for ${configuration.provider}. Set one of: ${variables.join(', ')}.`,
    };
}
