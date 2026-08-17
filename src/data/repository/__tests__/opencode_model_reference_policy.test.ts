import { resolveOpenCodeModelReference } from '../opencode_model_reference_policy';

describe('resolveOpenCodeModelReference', () => {
    it('uses the explicit provider/model reference', () => {
        expect(resolveOpenCodeModelReference('anthropic/claude')).toEqual({
            providerId: 'anthropic',
            modelId: 'claude',
        });
    });

    it('defaults an unqualified model to OpenCode', () => {
        expect(resolveOpenCodeModelReference('gpt-5')).toEqual({
            providerId: 'opencode',
            modelId: 'gpt-5',
        });
    });

    it('rejects an empty qualified model', () => {
        expect(() => resolveOpenCodeModelReference('anthropic/')).toThrow('provider/model');
    });
});
