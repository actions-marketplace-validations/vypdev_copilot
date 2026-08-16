import type { AgentFailureCategory, AgentExecutionPhase } from '../model/agent_execution';

export interface OpenCodeMessageRequest {
    readonly serverUrl: string;
    readonly agent: string;
    readonly providerID: string;
    readonly modelID: string;
    readonly prompt: string;
    readonly signal?: AbortSignal;
}

export interface OpenCodeMessageResponse {
    readonly sessionId: string;
    readonly parts: readonly unknown[];
}

export interface OpenCodeHttpClientOptions {
    readonly requestTimeoutMs: number;
    readonly fetchFn?: typeof fetch;
}

export class OpenCodeClientError extends Error {
    constructor(
        message: string,
        readonly phase: AgentExecutionPhase,
        readonly category: AgentFailureCategory,
        readonly retryable: boolean,
        readonly httpStatus?: number,
    ) {
        super(message);
        this.name = 'OpenCodeClientError';
    }
}

export class OpenCodeHttpClient {
    private readonly fetchFn: typeof fetch;

    constructor(private readonly options: OpenCodeHttpClientOptions) {
        this.fetchFn = options.fetchFn ?? fetch;
    }

    async checkHealth(serverUrl: string, signal?: AbortSignal): Promise<boolean> {
        const response = await this.request(serverUrl, '/global/health', {
            method: 'GET',
            signal,
        }, 'readiness');
        if (!response.ok) return false;
        const payload = await this.readJson<{ healthy?: boolean }>(response, 'OpenCode health');
        return payload.healthy === true;
    }

    async sendMessage(request: OpenCodeMessageRequest): Promise<OpenCodeMessageResponse> {
        const baseUrl = request.serverUrl.replace(/\/+$/, '');
        const sessionResponse = await this.request(baseUrl, '/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: 'copilot' }),
            signal: request.signal,
        }, 'invocation');
        const session = await this.readJson<{ id?: string; data?: { id?: string } }>(sessionResponse, 'OpenCode session');
        const sessionId = session.id ?? session.data?.id;
        if (!sessionId) {
            throw new OpenCodeClientError('OpenCode session response did not include an id', 'parse', 'malformed_response', false);
        }

        const messageResponse = await this.request(baseUrl, `/session/${encodeURIComponent(sessionId)}/message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                agent: request.agent,
                model: { providerID: request.providerID, modelID: request.modelID },
                parts: [{ type: 'text', text: request.prompt }],
            }),
            signal: request.signal,
        }, 'invocation');
        const payload = await this.readJson<{ parts?: unknown[]; data?: { parts?: unknown[] } }>(messageResponse, 'OpenCode message');
        const parts = payload.parts ?? payload.data?.parts;
        if (!Array.isArray(parts)) {
            throw new OpenCodeClientError('OpenCode message response did not include parts', 'parse', 'malformed_response', false);
        }
        return { sessionId, parts };
    }

    private async request(
        baseUrl: string,
        path: string,
        init: RequestInit,
        phase: AgentExecutionPhase,
    ): Promise<Response> {
        let response: Response;
        try {
            response = await this.fetchFn(`${baseUrl}${path}`, {
                ...init,
                signal: init.signal ?? AbortSignal.timeout(this.options.requestTimeoutMs),
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            throw new OpenCodeClientError(`OpenCode request failed: ${message}`, phase, 'network', true);
        }
        if (!response.ok) {
            const retryable = response.status === 408 || response.status === 429 || response.status >= 500;
            const category: AgentFailureCategory = response.status === 401 || response.status === 403
                ? 'authentication'
                : response.status === 429 ? 'rate_limit' : 'network';
            throw new OpenCodeClientError(`OpenCode request failed with HTTP ${response.status}`, phase, category, retryable, response.status);
        }
        return response;
    }

    private async readJson<T>(response: Response, context: string): Promise<T> {
        let payload: unknown;
        try {
            payload = await response.json();
        } catch {
            throw new OpenCodeClientError(`${context} returned invalid JSON`, 'parse', 'malformed_response', false, response.status);
        }
        return payload as T;
    }
}
