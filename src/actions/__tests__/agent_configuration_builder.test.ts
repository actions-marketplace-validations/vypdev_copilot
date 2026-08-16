import { buildAgentTasks } from '../agent_configuration_builder';

describe('buildAgentTasks', () => {
    it('builds the same selected agent for findings and fixer', () => {
        const tasks = buildAgentTasks({
            provider: ' Cursor ',
            transport: 'cli',
            model: ' cursor-agent ',
            command: 'cursor-agent --headless',
        });

        expect(tasks).toEqual({
            findings: { provider: 'cursor', transport: 'cli', model: 'cursor-agent', command: 'cursor-agent --headless' },
            fixer: { provider: 'cursor', transport: 'cli', model: 'cursor-agent', command: 'cursor-agent --headless' },
        });
    });

    it('rejects unknown providers and transports', () => {
        expect(() => buildAgentTasks({ provider: 'unknown', transport: 'server', model: 'model' })).toThrow('Unsupported agent provider');
        expect(() => buildAgentTasks({ provider: 'codex', transport: 'unknown', model: 'model' })).toThrow('Unsupported agent transport');
    });

    it('rejects an empty model', () => {
        expect(() => buildAgentTasks({ provider: 'opencode', transport: 'server', model: ' ' })).toThrow('Agent model must not be empty');
    });
});
