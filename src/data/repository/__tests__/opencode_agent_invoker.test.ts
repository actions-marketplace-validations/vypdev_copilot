import type { OpenCodeClientPort } from '../../../infrastructure/agents/ports/agent_provider_ports';
import { withOpenCodeRetry } from '../opencode_retry';
import { OpenCodeAgentInvoker } from '../opencode_agent_invoker';

describe('OpenCodeAgentInvoker', () => {
    it('delegates the request and returns the provider response', async () => {
        const client: OpenCodeClientPort = {
            sendMessage: jest.fn().mockResolvedValue({ sessionId: 'session-1', parts: [{ type: 'text', text: 'ok' }] }),
        };
        const invoker = new OpenCodeAgentInvoker(client, withOpenCodeRetry);

        await expect(invoker.invoke({
            serverUrl: 'http://localhost:4096',
            providerID: 'openai',
            modelID: 'gpt-5',
            agent: 'build',
            prompt: 'hello',
        }, 'agent build', (response) => response)).resolves.toEqual({
            sessionId: 'session-1',
            parts: [{ type: 'text', text: 'ok' }],
        });
        expect(client.sendMessage).toHaveBeenCalledWith(expect.objectContaining({ agent: 'build' }));
    });

    it('retries provider failures through the retry policy', async () => {
        const client: OpenCodeClientPort = {
            sendMessage: jest.fn()
                .mockRejectedValueOnce(new Error('transient'))
                .mockResolvedValueOnce({ sessionId: 'session-2', parts: [] }),
        };
        const invoker = new OpenCodeAgentInvoker(client, withOpenCodeRetry);

        await expect(invoker.invoke({
            serverUrl: 'http://localhost:4096',
            providerID: 'openai',
            modelID: 'gpt-5',
            agent: 'build',
            prompt: 'hello',
        }, 'agent build', (response) => response)).resolves.toEqual({ sessionId: 'session-2', parts: [] });
        expect(client.sendMessage).toHaveBeenCalledTimes(2);
    });
});
