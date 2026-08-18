export interface ManagedAgentServer {
    url: string;
    stop(): Promise<void>;
}

export interface AgentServerLifecyclePort {
    start(options?: { port?: number; hostname?: string; cwd?: string }): Promise<ManagedAgentServer>;
}
