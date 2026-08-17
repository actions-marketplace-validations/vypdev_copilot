import { OPENCODE_REQUEST_TIMEOUT_MS } from '../../utils/constants';
import { logInfo } from '../../utils/logger';
import { withOpenCodeRetry } from './opencode_retry';

export interface OpenCodeFileDiff {
    path?: string;
    file?: string;
    [key: string]: unknown;
}

function ensureNoTrailingSlash(url: string): string {
    return url.replace(/\/+$/, '') || url;
}

function createTimeoutSignal(ms: number): AbortSignal {
    const controller = new AbortController();
    setTimeout(() => controller.abort(new Error(`OpenCode request timeout after ${ms}ms`)), ms);
    return controller.signal;
}

export async function getSessionDiff(baseUrl: string, sessionId: string): Promise<OpenCodeFileDiff[]> {
    return withOpenCodeRetry(async () => {
        logInfo(`OpenCode request [session diff] sessionId=${sessionId}`);
        const signal = createTimeoutSignal(OPENCODE_REQUEST_TIMEOUT_MS);
        const res = await fetch(`${ensureNoTrailingSlash(baseUrl)}/session/${sessionId}/diff`, {
            method: 'GET',
            signal,
        });
        if (!res.ok) {
            logInfo(`OpenCode response [session diff] fileCount=0 (status ${res.status})`);
            return [];
        }
        const raw = await res.text();
        if (!raw?.trim()) {
            logInfo('OpenCode response [session diff] fileCount=0 (empty body)');
            return [];
        }
        let data: OpenCodeFileDiff[] | { data?: OpenCodeFileDiff[] };
        try {
            data = JSON.parse(raw) as OpenCodeFileDiff[] | { data?: OpenCodeFileDiff[] };
        } catch {
            logInfo('OpenCode response [session diff] fileCount=0 (invalid JSON)');
            return [];
        }
        const list = Array.isArray(data) ? data : Array.isArray(data.data) ? data.data : [];
        logInfo(`OpenCode response [session diff] fileCount=${list.length}`);
        return list;
    }, 'session diff');
}
