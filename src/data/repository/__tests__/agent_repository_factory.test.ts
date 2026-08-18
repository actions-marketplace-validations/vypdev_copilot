import type { AgentCliPort, OpenCodeClientPort } from '../../../infrastructure/agents/ports/agent_provider_ports';
import { DefaultAgentRepositoryFactory } from '../agent_repository_factory';

describe('DefaultAgentRepositoryFactory', () => {
    it('creates separate capability views over one injected repository composition', () => {
        const cli: AgentCliPort = { execute: jest.fn().mockResolvedValue('ok') };
        const openCode: OpenCodeClientPort = { sendMessage: jest.fn() };
        const factory = new DefaultAgentRepositoryFactory({ cli, openCode });

        const findings = factory.createFindings();
        const fixer = factory.createFixer();

        expect(findings).toBe(fixer);
    });
});
