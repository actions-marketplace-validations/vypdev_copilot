import type { OpenCodeClientPort } from './agent_ports';
import type { OpenCodeMessageRequest } from './opencode_http_client';
import { withOpenCodeRetry } from './opencode_retry';

type OpenCodeRetryPolicy = <T>(operation: () => Promise<T>, context: string) => Promise<T>;

export interface OpenCodeAgentResponse {
    parts: unknown;
    sessionId: string;
}

export class OpenCodeAgentInvoker {
    constructor(
        private readonly client: OpenCodeClientPort,
        private readonly retry: OpenCodeRetryPolicy = withOpenCodeRetry,
    ) {}

    invoke<T>(
        request: OpenCodeMessageRequest,
        context: string,
        interpret: (response: OpenCodeAgentResponse) => T | Promise<T>,
    ): Promise<T> {
        return this.retry(
            async () => interpret(await this.client.sendMessage(request)),
            context,
        );
    }
}
