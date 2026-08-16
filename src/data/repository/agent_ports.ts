import type {
    AgentExecutionRequest,
    AgentExecutionResult,
    FindingsResult,
    FixerResult,
} from '../model/agent_execution';

export interface AgentCliPort {
    execute(request: {
        command: string;
        prompt: string;
        timeoutMs: number;
        signal?: AbortSignal;
        cwd?: string;
        maxOutputBytes?: number;
    }): Promise<string>;
}

export interface OpenCodeClientPort {
    sendMessage(request: {
        serverUrl: string;
        providerID: string;
        modelID: string;
        agent: string;
        prompt: string;
        signal?: AbortSignal;
    }): Promise<{ parts: unknown; sessionId: string }>;
}

export interface FindingsAgentPort {
    execute(request: AgentExecutionRequest): Promise<AgentExecutionResult<FindingsResult>>;
}

export interface FixerAgentPort {
    execute(request: AgentExecutionRequest): Promise<AgentExecutionResult<FixerResult>>;
}
