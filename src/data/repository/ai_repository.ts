import { OPENCODE_REQUEST_TIMEOUT_MS } from '../../utils/constants';
import { logDebugInfo, logError, logInfo } from '../../utils/logger';
import { Ai } from '../model/ai';
import { parseJsonFromAgentText } from './agent_json_parser';
import { AgentCliClient } from './agent_cli_client';
import { ProviderCliAdapter } from './provider_cli_adapter';
import { OpenCodeHttpClient } from './opencode_http_client';
import type { AgentCliPort, AgentQueryOptions, FindingsQueryPort, FixerQueryPort, OpenCodeClientPort } from './agent_ports';
import { withOpenCodeRetry } from './opencode_retry';
import { buildAgentPrompt } from './agent_prompt_policy';
import { getValidatedAgentConfiguration } from './agent_configuration_policy';
import { extractReasoningFromParts, extractTextFromParts } from './agent_response_parser';
export { LANGUAGE_CHECK_RESPONSE_SCHEMA, THINK_RESPONSE_SCHEMA, TRANSLATION_RESPONSE_SCHEMA } from './agent_response_schemas';

export const OPENCODE_AGENT_PLAN = 'build';
export const OPENCODE_AGENT_BUILD = 'build';
export type AskAgentOptions = AgentQueryOptions;

function createTimeoutSignal(ms: number): AbortSignal {
    const controller = new AbortController();
    setTimeout(() => controller.abort(new Error(`OpenCode request timeout after ${ms}ms`)), ms);
    return controller.signal;
}

function ensureNoTrailingSlash(url: string): string {
    return url.replace(/\/+$/, '') || url;
}

/** File diff from OpenCode GET /session/:id/diff */
export interface OpenCodeFileDiff {
    path?: string;
    file?: string;
    [key: string]: unknown;
}

/**
 * Get the diff for an OpenCode session (files changed by the agent).
 * Call after opencodeMessageWithAgent when using the "build" agent so the user can see what was edited.
 * Wrapped with retries (OPENCODE_MAX_RETRIES).
 */
export async function getSessionDiff(
    baseUrl: string,
    sessionId: string
): Promise<OpenCodeFileDiff[]> {
    return withOpenCodeRetry(async () => {
        logInfo(`OpenCode request [session diff] sessionId=${sessionId}`);
        const base = ensureNoTrailingSlash(baseUrl);
        const signal = createTimeoutSignal(OPENCODE_REQUEST_TIMEOUT_MS);
        const res = await fetch(`${base}/session/${sessionId}/diff`, { method: 'GET', signal });
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
        const list = Array.isArray(data)
            ? data
            : Array.isArray((data as { data?: OpenCodeFileDiff[] }).data)
                ? (data as { data: OpenCodeFileDiff[] }).data
                : [];
        logInfo(`OpenCode response [session diff] fileCount=${list.length}`);
        return list;
    }, 'session diff');
}

export class AiRepository implements FindingsQueryPort, FixerQueryPort {
    private readonly cliAdapter: ProviderCliAdapter;
    private readonly openCodeClient: OpenCodeClientPort;

    constructor(
        cliClient: AgentCliPort = new AgentCliClient(),
        openCodeClient: OpenCodeClientPort = new OpenCodeHttpClient({ requestTimeoutMs: OPENCODE_REQUEST_TIMEOUT_MS }),
    ) {
        this.cliAdapter = new ProviderCliAdapter(cliClient);
        this.openCodeClient = openCodeClient;
    }
    /**
     * Ask an OpenCode agent (e.g. Plan) to perform a task. All calls use strict response (expectJson + schema).
     * Single retry system: HTTP failures and parse failures both retry up to OPENCODE_MAX_RETRIES.
     */
    askAgent = async (
        ai: Ai,
        agentId: string,
        prompt: string,
        options: AskAgentOptions = {}
    ): Promise<string | Record<string, unknown> | undefined> => {
        const schemaName = options.schemaName ?? 'response';
        const promptText = buildAgentPrompt(
            prompt,
            options.expectJson ?? false,
            options.schema,
            schemaName,
        );
        const taskConfiguration = getValidatedAgentConfiguration(ai.getAgentConfiguration('findings'), 'findings');
        if (taskConfiguration.transport === 'cli') {
            try {
                const output = await this.cliAdapter.execute({
                    configuration: taskConfiguration,
                    prompt: promptText,
                    timeoutMs: OPENCODE_REQUEST_TIMEOUT_MS,
                });
                if (options.expectJson && options.schema) return parseJsonFromAgentText(output);
                return output;
            } catch (error: unknown) {
                logError(`Error querying ${taskConfiguration.provider} CLI: ${error instanceof Error ? error.message : String(error)}`);
                return undefined;
            }
        }
        if (taskConfiguration.provider !== 'opencode' || !taskConfiguration.serverUrl || !taskConfiguration.model.trim()) {
            logError('Missing required AI configuration for findings server transport.');
            return undefined;
        }
        const modelReference = taskConfiguration.model.trim();
        const separator = modelReference.indexOf('/');
        const providerID = separator > 0 ? modelReference.slice(0, separator) : 'opencode';
        const modelID = separator > 0 ? modelReference.slice(separator + 1).trim() : modelReference;
        const serverUrl = taskConfiguration.serverUrl;
        const model = taskConfiguration.model;
        if (!modelID.trim()) {
            throw new Error(`OpenCode model must use provider/model format for findings.`);
        }
        try {
            return await withOpenCodeRetry(async () => {
                const client = this.openCodeClient;
                const { parts } = await client.sendMessage({
                    serverUrl,
                    providerID,
                    modelID,
                    agent: agentId,
                    prompt: promptText,
                });
                const text = extractTextFromParts(parts);
                if (!text) throw new Error('Empty response text');
                const reasoning = options.includeReasoning ? extractReasoningFromParts(parts) : '';
                if (options.expectJson && options.schema) {
                    logInfo(`OpenCode agent response (expectJson=true) length=${text.length}`);
                    logDebugInfo(`OpenCode agent response (full text, no truncation) length=${text.length}:\n${text}`);
                    const parsed = parseJsonFromAgentText(text);
                    if (options.includeReasoning && reasoning) {
                        return { ...parsed, reasoning };
                    }
                    return parsed;
                }
                return text;
            }, `agent ${agentId}`);
        } catch (error: unknown) {
            const err = error instanceof Error ? error : new Error(String(error));
            const cause = err instanceof Error && (err as Error & { cause?: unknown }).cause;
            const detail = cause != null ? ` (${cause instanceof Error ? cause.message : String(cause)})` : '';
            logError(`Error querying OpenCode agent ${agentId} (${model}): ${err.message}${detail}`);
            return undefined;
        }
    };

    /**
     * Run the OpenCode "build" agent for the copilot command. Returns the final message and sessionId.
     * Uses the same retry system (OPENCODE_MAX_RETRIES).
     */
    copilotMessage = async (
        ai: Ai,
        prompt: string
    ): Promise<{ text: string; sessionId: string } | undefined> => {
        const taskConfiguration = getValidatedAgentConfiguration(ai.getAgentConfiguration('fixer'), 'fixer');
        if (taskConfiguration.transport === 'cli') {
            try {
                const text = await this.cliAdapter.execute({
                    configuration: taskConfiguration,
                    prompt,
                    timeoutMs: OPENCODE_REQUEST_TIMEOUT_MS,
                });
                return { text, sessionId: 'cli' };
            } catch (error: unknown) {
                logError(`Error querying ${taskConfiguration.provider} CLI fixer: ${error instanceof Error ? error.message : String(error)}`);
                return undefined;
            }
        }
        if (taskConfiguration.provider !== 'opencode' || !taskConfiguration.serverUrl || !taskConfiguration.model.trim()) {
            logError('Missing required AI configuration for fixer server transport.');
            return undefined;
        }
        const modelReference = taskConfiguration.model.trim();
        const separator = modelReference.indexOf('/');
        const providerID = separator > 0 ? modelReference.slice(0, separator) : 'opencode';
        const modelID = separator > 0 ? modelReference.slice(separator + 1).trim() : modelReference;
        const serverUrl = taskConfiguration.serverUrl;
        const model = taskConfiguration.model;
        if (!modelID.trim()) {
            throw new Error('OpenCode model must use provider/model format for fixer.');
        }
        try {
            return await withOpenCodeRetry(
                async () => {
                    const client = this.openCodeClient;
                    const result = await client.sendMessage({
                        serverUrl,
                        providerID,
                        modelID,
                        agent: OPENCODE_AGENT_BUILD,
                        prompt,
                    });
                    const text = extractTextFromParts(result.parts);
                    if (!text) throw new Error('Empty response text');
                    return { text, sessionId: result.sessionId };
                },
                `agent ${OPENCODE_AGENT_BUILD}`
            );
        } catch (error: unknown) {
            const err = error instanceof Error ? error : new Error(String(error));
            logError(`Error querying OpenCode build agent (${model}): ${err.message}`);
            return undefined;
        }
    };
}
