import type { AgentConfiguration } from '../model/agent';
import { ProviderCliAdapter, type ProviderCliExecution } from './provider_cli_adapter';

export class CursorCliAdapter {
    constructor(private readonly delegate: ProviderCliAdapter = new ProviderCliAdapter()) {}

    execute(request: ProviderCliExecution): Promise<string> {
        assertCursorConfiguration(request.configuration);
        return this.delegate.execute(request);
    }
}

export function assertCursorConfiguration(configuration: AgentConfiguration): void {
    if (configuration.provider !== 'cursor') throw new Error(`Cursor adapter received ${configuration.provider} configuration.`);
    if (configuration.transport !== 'cli') throw new Error('Cursor adapter requires cli transport.');
    if (!configuration.command?.trim()) throw new Error('Cursor CLI command is required.');
}
