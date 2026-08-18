import type { Ai } from '../../data/model/ai';
import type {
    AgentExecutionRequest,
    AgentExecutionResult,
    FindingsResult,
    FixerResult,
} from '../../data/model/agent_execution';

/** Application-facing options for an agent query. */
export interface AgentQueryOptions {
    expectJson?: boolean;
    schema?: Record<string, unknown>;
    schemaName?: string;
    includeReasoning?: boolean;
}

/** Transitional semantic port; its Ai argument will be replaced by an application request in the next AI slice. */
export interface FindingsQueryPort {
    askAgent(ai: Ai, agentId: string, prompt: string, options?: AgentQueryOptions): Promise<string | Record<string, unknown> | undefined>;
}

/** Transitional semantic port; its Ai argument will be replaced by an application request in the next AI slice. */
export interface FixerQueryPort {
    copilotMessage(ai: Ai, prompt: string): Promise<{ text: string; sessionId: string } | undefined>;
}

export interface ManagedAgentServer {
    url: string;
    stop(): Promise<void>;
}

export interface AgentServerLifecyclePort {
    start(options?: { port?: number; hostname?: string; cwd?: string }): Promise<ManagedAgentServer>;
}

export interface FindingsAgentPort {
    execute(request: AgentExecutionRequest): Promise<AgentExecutionResult<FindingsResult>>;
}

export interface FixerAgentPort {
    execute(request: AgentExecutionRequest): Promise<AgentExecutionResult<FixerResult>>;
}
