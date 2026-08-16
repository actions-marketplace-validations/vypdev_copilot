import type { AgentConfiguration } from '../model/agent';
import { ProviderCliAdapter, type ProviderCliExecution } from './provider_cli_adapter';

export class CodexCliAdapter {
    constructor(private readonly delegate: ProviderCliAdapter = new ProviderCliAdapter()) {}

    execute(request: ProviderCliExecution): Promise<string> {
        assertCodexConfiguration(request.configuration);
        return this.delegate.execute(request);
    }
}

export function assertCodexConfiguration(configuration: AgentConfiguration): void {
    if (configuration.provider !== 'codex') throw new Error(`Codex adapter received ${configuration.provider} configuration.`);
    if (configuration.transport !== 'cli') throw new Error('Codex adapter requires cli transport.');
    if (!configuration.command?.trim()) throw new Error('Codex CLI command is required.');
}
