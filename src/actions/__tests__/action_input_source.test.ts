import { resolveActionInput } from '../action_input_source';

describe('resolveActionInput', () => {
    it('prefers explicit runtime parameters over defaults', () => {
        expect(resolveActionInput({ token: 'runtime' }, { token: 'default' }, 'token')).toBe('runtime');
    });

    it('uses action defaults when no runtime parameter is provided', () => {
        expect(resolveActionInput({}, { token: 'default' }, 'token')).toBe('default');
    });

    it('treats nullish runtime values as absent', () => {
        expect(resolveActionInput({ token: undefined }, { token: 'default' }, 'token')).toBe('default');
    });
});
