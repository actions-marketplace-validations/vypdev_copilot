import { Ai } from '../ai';
import { isAgentConfigurationReady } from '../agent';

describe('Ai', () => {
    it('exposes independent task configurations', () => {
        const ai = new Ai('http://opencode:4096', 'opencode/model', true, false, [], false, 'low', 10, [], {
            findings: { provider: 'codex', transport: 'cli', model: 'gpt-5-codex', command: 'codex' },
            fixer: { provider: 'cursor', transport: 'cli', model: 'cursor-agent', command: 'cursor-agent' },
        });

        expect(ai.getAgentConfiguration('findings')).toEqual({
            provider: 'codex', transport: 'cli', model: 'gpt-5-codex', command: 'codex',
        });
        expect(ai.getAgentConfiguration('fixer')).toEqual({
            provider: 'cursor', transport: 'cli', model: 'cursor-agent', command: 'cursor-agent',
        });
    });

    it('defaults both tasks to the configured OpenCode server', () => {
        const ai = new Ai('http://opencode:4096', 'opencode/model', true, false, [], false, 'low', 10);
        const expected = { provider: 'opencode', transport: 'server', model: 'opencode/model', serverUrl: 'http://opencode:4096' };

        expect(ai.getAgentConfiguration('findings')).toEqual(expected);
        expect(ai.getAgentConfiguration('fixer')).toEqual(expected);
    });

    it('keeps general AI and bugbot settings available', () => {
        const ai = new Ai('http://server', 'model', true, true, ['a', 'b'], false, 'error', 5, ['pnpm test']);

        expect(ai.getAiPullRequestDescription()).toBe(true);
        expect(ai.getAiMembersOnly()).toBe(true);
        expect(ai.getAiIgnoreFiles()).toEqual(['a', 'b']);
        expect(ai.getAiIncludeReasoning()).toBe(false);
        expect(ai.getBugbotMinSeverity()).toBe('error');
        expect(ai.getBugbotCommentLimit()).toBe(5);
        expect(ai.getBugbotFixVerifyCommands()).toEqual(['pnpm test']);
    });

    it('validates server and CLI configurations without provider knowledge', () => {
        expect(isAgentConfigurationReady({ provider: 'opencode', transport: 'server', model: 'm', serverUrl: 'http://x' })).toBe(true);
        expect(isAgentConfigurationReady({ provider: 'codex', transport: 'cli', model: 'm', command: 'codex' })).toBe(true);
        expect(isAgentConfigurationReady({ provider: 'cursor', transport: 'cli', model: 'm' })).toBe(false);
        expect(isAgentConfigurationReady(undefined)).toBe(false);
    });
});
