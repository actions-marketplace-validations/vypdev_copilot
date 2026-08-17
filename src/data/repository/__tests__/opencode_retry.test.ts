import { OPENCODE_MAX_RETRIES, OPENCODE_RETRY_DELAY_MS } from '../../../utils/constants';
import { withOpenCodeRetry } from '../opencode_retry';

describe('withOpenCodeRetry', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('returns the first successful result without waiting', async () => {
        const operation = jest.fn().mockResolvedValue('ok');

        await expect(withOpenCodeRetry(operation, 'test')).resolves.toBe('ok');
        expect(operation).toHaveBeenCalledTimes(1);
    });

    it('retries after failures and returns the later result', async () => {
        const operation = jest.fn().mockRejectedValueOnce(new Error('temporary')).mockResolvedValue('ok');
        const promise = withOpenCodeRetry(operation, 'test');

        await jest.advanceTimersByTimeAsync(OPENCODE_RETRY_DELAY_MS);
        await expect(promise).resolves.toBe('ok');
        expect(operation).toHaveBeenCalledTimes(2);
    });

    it('rethrows the final error after exhausting retries', async () => {
        const error = new Error('permanent');
        const operation = jest.fn().mockRejectedValue(error);
        const promise = withOpenCodeRetry(operation, 'test');
        const rejection = expect(promise).rejects.toBe(error);

        await jest.advanceTimersByTimeAsync((OPENCODE_MAX_RETRIES - 1) * OPENCODE_RETRY_DELAY_MS);
        await rejection;
        expect(operation).toHaveBeenCalledTimes(OPENCODE_MAX_RETRIES);
    });
});
