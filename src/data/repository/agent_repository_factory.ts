import type { FindingsQueryPort, FixerQueryPort } from '../../application/ports/agent_ports';
import type { AgentCliPort, OpenCodeClientPort } from '../../infrastructure/agents/ports/agent_provider_ports';
import { AgentCliClient } from './agent_cli_client';
import { AiRepository } from './ai_repository';
import { OpenCodeHttpClient } from './opencode_http_client';
import { OPENCODE_REQUEST_TIMEOUT_MS } from '../../utils/constants';

export interface AgentRepositoryInfrastructure {
    readonly cli: AgentCliPort;
    readonly openCode: OpenCodeClientPort;
}

export class DefaultAgentRepositoryFactory {
    private readonly repository: AiRepository;

    constructor(infrastructure: AgentRepositoryInfrastructure = {
        cli: new AgentCliClient(),
        openCode: new OpenCodeHttpClient({ requestTimeoutMs: OPENCODE_REQUEST_TIMEOUT_MS }),
    }) {
        this.repository = new AiRepository(infrastructure.cli, infrastructure.openCode);
    }

    createFindings(): FindingsQueryPort {
        return this.repository;
    }

    createFixer(): FixerQueryPort {
        return this.repository;
    }
}
