import { ProviderCliAdapter } from '../provider_cli_adapter';
import type { AgentCliPort } from '../../../infrastructure/agents/ports/agent_provider_ports';

describe('ProviderCliAdapter', () => {
    it('delegates a resolved CLI configuration without changing the prompt', async () => {
        const execute = jest.fn().mockResolvedValue('result');
        const adapter = new ProviderCliAdapter({ execute } as unknown as AgentCliPort);
        const result = await adapter.execute({
            configuration: { provider: 'cursor', transport: 'cli', model: 'cursor', command: 'cursor-agent' },
            prompt: 'inspect changes',
            timeoutMs: 1000,
        });
        expect(result).toBe('result');
        expect(execute).toHaveBeenCalledWith({ command: 'cursor-agent', prompt: 'inspect changes', timeoutMs: 1000, cwd: undefined, signal: undefined });
    });

    it('rejects a server configuration before invoking the process port', async () => {
        const execute = jest.fn();
        const adapter = new ProviderCliAdapter({ execute } as unknown as AgentCliPort);
        expect(() => adapter.execute({
            configuration: { provider: 'opencode', transport: 'server', model: 'model', serverUrl: 'http://localhost' },
            prompt: 'inspect',
            timeoutMs: 1000,
        })).toThrow('CLI adapter cannot execute server transport');
        expect(execute).not.toHaveBeenCalled();
    });
});
