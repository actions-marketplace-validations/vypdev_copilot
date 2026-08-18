import type { AgentServerLifecyclePort, ManagedAgentServer } from '../../application/ports/agent_server_ports';
import { startOpencodeServer } from '../../utils/opencode_server';

/** Infrastructure adapter for the managed OpenCode server lifecycle. */
export class OpenCodeServerLifecycleAdapter implements AgentServerLifecyclePort {
    start(options?: { port?: number; hostname?: string; cwd?: string }): Promise<ManagedAgentServer> {
        return startOpencodeServer(options);
    }
}
