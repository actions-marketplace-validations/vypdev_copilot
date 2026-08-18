import type { AgentCliPort, OpenCodeClientPort } from '../../../infrastructure/agents/ports/agent_provider_ports';
import { DefaultAgentRepositoryFactory } from '../agent_repository_factory';

describe('DefaultAgentRepositoryFactory', () => {
    it('creates independent semantic adapters over shared technical infrastructure', () => {
        const cli: AgentCliPort = { execute: jest.fn().mockResolvedValue('ok') };
        const openCode: OpenCodeClientPort = { sendMessage: jest.fn() };
        const factory = new DefaultAgentRepositoryFactory({ cli, openCode });

        const findings = factory.createFindings();
        const fixer = factory.createFixer();

        expect(findings).not.toBe(fixer);
        expect(typeof findings.query).toBe('function');
        expect(typeof fixer.fix).toBe('function');
    });
});
