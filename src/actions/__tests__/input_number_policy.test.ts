import { parseIntegerInput } from '../input_number_policy';

describe('input number policy', () => {
    it('parses integer strings and numbers', () => {
        expect(parseIntegerInput('42', 0)).toBe(42);
        expect(parseIntegerInput(7, 0)).toBe(7);
    });

    it('uses the fallback for missing or invalid values', () => {
        expect(parseIntegerInput(undefined, 3)).toBe(3);
        expect(parseIntegerInput('invalid', 3)).toBe(3);
        expect(parseIntegerInput(Infinity, 3)).toBe(3);
    });
});
