import { OpenCodeClientError, OpenCodeHttpClient } from '../opencode_http_client';

describe('OpenCodeHttpClient', () => {
    const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
    });

    it('creates a session and sends a message through the OpenCode protocol', async () => {
        const fetchFn = jest.fn()
            .mockResolvedValueOnce(response({ id: 'session-1' }))
            .mockResolvedValueOnce(response({ parts: [{ type: 'text', text: 'ok' }] }));
        const client = new OpenCodeHttpClient({ requestTimeoutMs: 1000, fetchFn });

        await expect(client.sendMessage({
            serverUrl: 'http://127.0.0.1:4096/',
            agent: 'build',
            providerID: 'openai',
            modelID: 'gpt-5',
            prompt: 'Inspect the change',
        })).resolves.toEqual({ sessionId: 'session-1', parts: [{ type: 'text', text: 'ok' }] });
        expect(fetchFn).toHaveBeenCalledWith('http://127.0.0.1:4096/session', expect.objectContaining({ method: 'POST' }));
        expect(fetchFn).toHaveBeenCalledWith('http://127.0.0.1:4096/session/session-1/message', expect.objectContaining({ method: 'POST' }));
    });

    it('classifies authorization and transient HTTP errors', async () => {
        const unauthorized = new OpenCodeHttpClient({
            requestTimeoutMs: 1000,
            fetchFn: jest.fn().mockResolvedValue(response({}, 401)),
        });
        await expect(unauthorized.checkHealth('http://server')).rejects.toMatchObject({
            category: 'authentication',
            retryable: false,
            httpStatus: 401,
        });

        const unavailable = new OpenCodeHttpClient({
            requestTimeoutMs: 1000,
            fetchFn: jest.fn().mockResolvedValue(response({}, 503)),
        });
        await expect(unavailable.checkHealth('http://server')).rejects.toMatchObject({
            category: 'network',
            retryable: true,
            httpStatus: 503,
        });
    });

    it('rejects malformed session and message payloads', async () => {
        const missingSession = new OpenCodeHttpClient({
            requestTimeoutMs: 1000,
            fetchFn: jest.fn().mockResolvedValue(response({})),
        });
        await expect(missingSession.sendMessage({
            serverUrl: 'http://server', agent: 'build', providerID: 'p', modelID: 'm', prompt: 'p',
        })).rejects.toBeInstanceOf(OpenCodeClientError);
    });
});
