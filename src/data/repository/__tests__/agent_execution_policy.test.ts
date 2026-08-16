import type { AgentConfiguration } from '../../model/agent';
import type { ProviderCliAdapter } from '../provider_cli_adapter';
import type { OpenCodeAgentInvoker } from '../opencode_agent_invoker';
import { executeAgentRequest } from '../agent_execution_policy';

const cliConfiguration: AgentConfiguration = {
    provider: 'cursor',
    transport: 'cli',
    command: 'cursor-agent',
    model: 'cursor/default',
};

const serverConfiguration: AgentConfiguration = {
    provider: 'opencode',
    transport: 'server',
    serverUrl: 'http://localhost:4096/',
    model: 'openai/gpt-5',
};

describe('executeAgentRequest', () => {
    it('executes CLI and maps its output', async () => {
        const cli = { execute: jest.fn().mockResolvedValue('cli output') } as unknown as ProviderCliAdapter;
        const invoker = {} as OpenCodeAgentInvoker;

        await expect(executeAgentRequest({
            configuration: cliConfiguration,
            prompt: 'prompt',
            agent: 'build',
            timeoutMs: 1000,
            cliAdapter: cli,
            openCodeInvoker: invoker,
            mapCliOutput: (output: string) => ({ value: output }),
            mapServerResponse: () => ({ value: 'server' }),
        })).resolves.toEqual({ value: 'cli output' });
        expect(cli.execute).toHaveBeenCalledWith({ configuration: cliConfiguration, prompt: 'prompt', timeoutMs: 1000 });
    });

    it('executes OpenCode server with resolved model reference', async () => {
        const cli = {} as ProviderCliAdapter;
        const invoker = { invoke: jest.fn().mockResolvedValue({ value: 'server' }) } as unknown as OpenCodeAgentInvoker;

        await expect(executeAgentRequest({
            configuration: serverConfiguration,
            prompt: 'prompt',
            agent: 'build',
            timeoutMs: 1000,
            cliAdapter: cli,
            openCodeInvoker: invoker,
            mapCliOutput: (output: string) => ({ value: output }),
            mapServerResponse: () => ({ value: 'server' }),
        })).resolves.toEqual({ value: 'server' });
        expect(invoker.invoke).toHaveBeenCalledWith(
            {
                serverUrl: 'http://localhost:4096/',
                providerID: 'openai',
                modelID: 'gpt-5',
                agent: 'build',
                prompt: 'prompt',
            },
            'agent build',
            expect.any(Function),
        );
    });

    it('rejects incomplete or unsupported server configuration', async () => {
        const cli = {} as ProviderCliAdapter;
        const invoker = { invoke: jest.fn() } as unknown as OpenCodeAgentInvoker;

        await expect(executeAgentRequest({
            configuration: { ...serverConfiguration, provider: 'cursor' },
            prompt: 'prompt',
            agent: 'build',
            timeoutMs: 1000,
            cliAdapter: cli,
            openCodeInvoker: invoker,
            mapCliOutput: (output: string) => ({ value: output }),
            mapServerResponse: () => ({ value: 'server' }),
        })).rejects.toThrow('server transport is not implemented');
    });
});
