import {
    OPENCODE_MAX_RETRIES,
    OPENCODE_RETRY_DELAY_MS,
} from '../../utils/constants';
import { logError, logInfo } from '../../utils/logger';

export async function withOpenCodeRetry<T>(fn: () => Promise<T>, context: string): Promise<T> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= OPENCODE_MAX_RETRIES; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            const message = error instanceof Error ? error.message : String(error);
            const cause =
                error instanceof Error && (error as Error & { cause?: unknown }).cause instanceof Error
                    ? (error as Error & { cause: Error }).cause.message
                    : '';
            const detail = cause ? ` (cause: ${cause})` : '';
            const noResponseHint =
                message === 'fetch failed'
                    ? ' No HTTP response; connection lost or timeout. If this was before the client timeout (see log above), the OpenCode server or a proxy may have a shorter timeout.'
                    : '';
            if (attempt < OPENCODE_MAX_RETRIES) {
                logInfo(
                    `OpenCode [${context}] attempt ${attempt}/${OPENCODE_MAX_RETRIES} failed: ${message}${detail}.${noResponseHint} Retrying in ${OPENCODE_RETRY_DELAY_MS}ms...`
                );
                await delay(OPENCODE_RETRY_DELAY_MS);
            } else {
                logError(`OpenCode [${context}] failed after ${OPENCODE_MAX_RETRIES} attempts: ${message}${detail}`);
            }
        }
    }
    throw lastError;
}

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
