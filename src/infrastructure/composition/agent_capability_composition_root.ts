import type { FindingsQueryPort, FixerQueryPort } from '../../application/ports/agent_ports';
import type { AgentCliPort, OpenCodeClientPort } from '../agents/ports/agent_provider_ports';
import { AgentCliClient } from '../../data/repository/agent_cli_client';
import { OpenCodeHttpClient } from '../../data/repository/opencode_http_client';
import { OPENCODE_REQUEST_TIMEOUT_MS } from '../../utils/constants';
import { FindingsAgentAdapter } from '../../data/repository/ai/findings_agent_adapter';
import { FixerAgentAdapter } from '../../data/repository/ai/fixer_agent_adapter';

export interface AgentCapabilityCompositionInfrastructure {
    readonly cli: AgentCliPort;
    readonly openCode: OpenCodeClientPort;
}

function defaultInfrastructure(): AgentCapabilityCompositionInfrastructure {
    return {
        cli: new AgentCliClient(),
        openCode: new OpenCodeHttpClient({ requestTimeoutMs: OPENCODE_REQUEST_TIMEOUT_MS }),
    };
}

export function createFindingsQueryPort(
    infrastructure: AgentCapabilityCompositionInfrastructure = defaultInfrastructure(),
): FindingsQueryPort {
    return new FindingsAgentAdapter(infrastructure);
}

export function createFixerQueryPort(
    infrastructure: AgentCapabilityCompositionInfrastructure = defaultInfrastructure(),
): FixerQueryPort {
    return new FixerAgentAdapter(infrastructure);
}
