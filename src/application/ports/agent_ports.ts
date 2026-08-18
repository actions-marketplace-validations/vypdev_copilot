export interface AgentConfiguration {
    provider: 'opencode' | 'codex' | 'cursor';
    transport: 'server' | 'cli';
    model: string;
    serverUrl?: string;
    command?: string;
}

export interface AgentQueryOptions {
    expectJson?: boolean;
    schema?: Record<string, unknown>;
    schemaName?: string;
    includeReasoning?: boolean;
}

export interface FindingsQueryRequest {
    configuration: AgentConfiguration | undefined;
    agentId: string;
    prompt: string;
    options?: AgentQueryOptions;
}

export interface FindingsQueryPort {
    query(request: FindingsQueryRequest): Promise<string | Record<string, unknown> | undefined>;
}

export interface FixerQueryRequest {
    configuration: AgentConfiguration | undefined;
    prompt: string;
}

export interface FixerQueryPort {
    fix(request: FixerQueryRequest): Promise<{ text: string; sessionId: string } | undefined>;
}

export interface ManagedAgentServer {
    url: string;
    stop(): Promise<void>;
}

export interface AgentServerLifecyclePort {
    start(options?: { port?: number; hostname?: string; cwd?: string }): Promise<ManagedAgentServer>;
}
