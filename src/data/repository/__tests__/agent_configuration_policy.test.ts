import { isValidServerAgentConfiguration } from '../agent_configuration_policy';

describe('isValidServerAgentConfiguration', () => {
    it('accepts a complete OpenCode server configuration', () => {
        expect(isValidServerAgentConfiguration({ provider: 'opencode', transport: 'server', model: 'gpt-5', serverUrl: 'http://localhost' })).toBe(true);
    });

    it('rejects unsupported, missing, or CLI configurations', () => {
        expect(isValidServerAgentConfiguration({ provider: 'cursor', transport: 'server', model: 'gpt-5', serverUrl: 'http://localhost' })).toBe(false);
        expect(isValidServerAgentConfiguration({ provider: 'opencode', transport: 'server', model: '', serverUrl: 'http://localhost' })).toBe(false);
        expect(isValidServerAgentConfiguration({ provider: 'opencode', transport: 'cli', model: 'gpt-5', command: 'opencode' })).toBe(false);
    });
});
