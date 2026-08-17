import { checkAgentAuthentication } from '../agent_authentication';

describe('checkAgentAuthentication', () => {
    it('does not require local credentials for server transport', () => {
        expect(
            checkAgentAuthentication({ provider: 'opencode', transport: 'server', model: 'model', serverUrl: 'http://localhost' }, {})
        ).toMatchObject({ status: 'not_required', variables: [] });
    });

    it('recognizes Cursor API credentials without exposing their value', () => {
        const result = checkAgentAuthentication(
            { provider: 'cursor', transport: 'cli', model: 'cursor-agent', command: 'cursor-agent' },
            { CURSOR_API_KEY: 'secret-value' }
        );
        expect(result.status).toBe('available');
        expect(result.message).not.toContain('secret-value');
        expect(result.variables).toEqual(['CURSOR_API_KEY']);
    });

    it('supports Codex access token or OpenAI API key', () => {
        expect(
            checkAgentAuthentication(
                { provider: 'codex', transport: 'cli', model: 'gpt-5-codex', command: 'codex' },
                { CODEX_ACCESS_TOKEN: 'token' }
            ).status
        ).toBe('available');
        expect(
            checkAgentAuthentication(
                { provider: 'codex', transport: 'cli', model: 'gpt-5-codex', command: 'codex' },
                { OPENAI_API_KEY: 'key' }
            ).status
        ).toBe('available');
    });

    it('reports the accepted variables when credentials are missing', () => {
        const result = checkAgentAuthentication(
            { provider: 'cursor', transport: 'cli', model: 'cursor-agent', command: 'cursor-agent' },
            {}
        );
        expect(result).toEqual({
            status: 'missing',
            variables: ['CURSOR_API_KEY'],
            message: 'No local credentials found for cursor. Set one of: CURSOR_API_KEY.',
        });
    });
});
