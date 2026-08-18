import type { FindingsQueryPort, FixerQueryPort } from '../../application/ports/agent_ports';
import type { AgentCliPort, OpenCodeClientPort } from '../../infrastructure/agents/ports/agent_provider_ports';
import { AgentCliClient } from './agent_cli_client';
import { OpenCodeHttpClient } from './opencode_http_client';
import { OPENCODE_REQUEST_TIMEOUT_MS } from '../../utils/constants';
import { FindingsAgentAdapter } from './ai/findings_agent_adapter';
import { FixerAgentAdapter } from './ai/fixer_agent_adapter';

export interface AgentRepositoryInfrastructure {
    readonly cli: AgentCliPort;
    readonly openCode: OpenCodeClientPort;
}

export class DefaultAgentRepositoryFactory {
    private readonly infrastructure: AgentRepositoryInfrastructure;

    constructor(infrastructure: AgentRepositoryInfrastructure = {
        cli: new AgentCliClient(),
        openCode: new OpenCodeHttpClient({ requestTimeoutMs: OPENCODE_REQUEST_TIMEOUT_MS }),
    }) {
        this.infrastructure = infrastructure;
    }

    createFindings(): FindingsQueryPort {
        return new FindingsAgentAdapter(this.infrastructure);
    }

    createFixer(): FixerQueryPort {
        return new FixerAgentAdapter(this.infrastructure);
    }
}
