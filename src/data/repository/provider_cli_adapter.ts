import type { AgentConfiguration } from '../model/agent';
import type { AgentCliPort } from './agent_ports';
import { AgentCliClient } from './agent_cli_client';

export interface ProviderCliExecution {
    configuration: AgentConfiguration;
    prompt: string;
    timeoutMs: number;
    cwd?: string;
    signal?: AbortSignal;
}

/** Provider-neutral CLI adapter. Provider-specific flags belong in future adapters. */
export class ProviderCliAdapter {
    constructor(private readonly client: AgentCliPort = new AgentCliClient()) {}

    execute(request: ProviderCliExecution): Promise<string> {
        if (request.configuration.transport !== 'cli') {
            throw new Error(`CLI adapter cannot execute ${request.configuration.transport} transport.`);
        }
        if (!request.configuration.command?.trim()) {
            throw new Error(`CLI command is required for ${request.configuration.provider}.`);
        }
        return this.client.execute({
            command: request.configuration.command,
            prompt: request.prompt,
            timeoutMs: request.timeoutMs,
            cwd: request.cwd,
            signal: request.signal,
        });
    }
}
