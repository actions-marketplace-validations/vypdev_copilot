import { OPENCODE_REQUEST_TIMEOUT_MS } from '../../utils/constants';
import { logDebugInfo, logError, logInfo } from '../../utils/logger';
import { Ai } from '../model/ai';
import { parseJsonFromAgentText } from './agent_json_parser';
import { OpenCodeHttpClient } from './opencode_http_client';
import { AgentCliClient } from './agent_cli_client';
import { withOpenCodeRetry } from './opencode_retry';
import { buildAgentPrompt } from './agent_prompt_policy';

function createTimeoutSignal(ms: number): AbortSignal {
    const controller = new AbortController();
    setTimeout(() => controller.abort(new Error(`OpenCode request timeout after ${ms}ms`)), ms);
    return controller.signal;
}

function ensureNoTrailingSlash(url: string): string {
    return url.replace(/\/+$/, '') || url;
}

/** Result of validating AI config for OpenCode calls. null when invalid. */
interface OpenCodeConfig {
    serverUrl: string;
    providerID: string;
    modelID: string;
    model: string;
}

function getValidatedOpenCodeConfig(ai: Ai): OpenCodeConfig | null {
    const serverUrl = ai.getOpencodeServerUrl();
    const model = ai.getOpencodeModel();
    if (!serverUrl?.trim() || !model?.trim()) {
        logError('Missing required AI configuration: opencode-server-url and opencode-model');
        return null;
    }
    const { providerID, modelID } = ai.getOpencodeModelParts();
    return { serverUrl, providerID, modelID, model };
}

function getValidatedAgentConfiguration(ai: Ai, task: 'findings' | 'fixer') {
    const configuration = ai.getAgentConfiguration(task);
    if (configuration.transport === 'sdk') {
        throw new Error(`Agent SDK transport is not implemented for ${configuration.provider}. Use server or cli.`);
    }
    if (configuration.transport === 'server' && configuration.provider !== 'opencode') {
        throw new Error(`Agent server transport is not implemented for ${configuration.provider}. Use cli.`);
    }
    if (configuration.transport === 'cli' && !configuration.command?.trim()) {
        throw new Error(`Agent CLI command is required for ${configuration.provider}.`);
    }
    return configuration;
}


function extractPartsByType(parts: unknown, type: string, joinWith: string): string {
    if (!Array.isArray(parts)) return '';
    return (parts as Array<{ type?: string; text?: string }>)
        .filter((p) => p?.type === type && typeof p.text === 'string')
        .map((p) => p.text as string)
        .join(joinWith)
        .trim();
}


/** Extract plain text from OpenCode message response parts (type === 'text'). */
function extractTextFromParts(parts: unknown): string {
    return extractPartsByType(parts, 'text', '');
}

/** Extract reasoning from OpenCode message parts (type === 'reasoning'). */
function extractReasoningFromParts(parts: unknown): string {
    return extractPartsByType(parts, 'reasoning', '\n\n');
}

/** Default OpenCode agent for analysis/planning (read-only, no file edits). Changed to build to support diffs. */
export const OPENCODE_AGENT_PLAN = 'build';

/** OpenCode agent with write/edit/bash for development (e.g. copilot when run locally). */
export const OPENCODE_AGENT_BUILD = 'build';

/** JSON schema for translation responses: translatedText (required), optional reason if translation failed. */
export const TRANSLATION_RESPONSE_SCHEMA = {
    type: 'object',
    properties: {
        translatedText: {
            type: 'string',
            description: 'The text translated to the requested locale. Required. Must not be empty.',
        },
        reason: {
            type: 'string',
            description:
                'Optional: reason why translation could not be produced or was partial (e.g. ambiguous input).',
        },
    },
    required: ['translatedText'],
    additionalProperties: false,
} as const;

/** JSON schema for Think (Q&A) responses: single answer field. */
export const THINK_RESPONSE_SCHEMA = {
    type: 'object',
    properties: {
        answer: {
            type: 'string',
            description: 'The concise answer to the user question. Required.',
        },
    },
    required: ['answer'],
    additionalProperties: false,
} as const;

/** JSON schema for language check: done (already in locale) or must_translate. */
export const LANGUAGE_CHECK_RESPONSE_SCHEMA = {
    type: 'object',
    properties: {
        status: {
            type: 'string',
            enum: ['done', 'must_translate'],
            description: 'done if text is in the requested locale, must_translate otherwise.',
        },
    },
    required: ['status'],
    additionalProperties: false,
} as const;

export interface AskAgentOptions {
    /** Request JSON response and parse it. If schema provided, include it in the prompt. */
    expectJson?: boolean;
    /** JSON schema for the response (used when expectJson is true to guide the model). */
    schema?: Record<string, unknown>;
    schemaName?: string;
    /** When true, include OpenCode agent reasoning (type "reasoning" parts) in the returned object as "reasoning". */
    includeReasoning?: boolean;
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

export class AiRepository {
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
        const config = getValidatedOpenCodeConfig(ai);
        if (!config) return undefined;
        const { serverUrl, providerID, modelID, model } = config;
        const schemaName = options.schemaName ?? 'response';
        const promptText = buildAgentPrompt(
            prompt,
            options.expectJson ?? false,
            options.schema,
            schemaName,
        );
        const taskConfiguration = getValidatedAgentConfiguration(ai, 'findings');
        if (taskConfiguration.transport === 'cli') {
            try {
                const output = await new AgentCliClient().execute({ command: taskConfiguration.command!, prompt: promptText, timeoutMs: OPENCODE_REQUEST_TIMEOUT_MS });
                if (options.expectJson && options.schema) return parseJsonFromAgentText(output);
                return output;
            } catch (error: unknown) {
                logError(`Error querying ${taskConfiguration.provider} CLI: ${error instanceof Error ? error.message : String(error)}`);
                return undefined;
            }
        }
        try {
            return await withOpenCodeRetry(async () => {
                const client = new OpenCodeHttpClient({ requestTimeoutMs: OPENCODE_REQUEST_TIMEOUT_MS });
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
        const taskConfiguration = getValidatedAgentConfiguration(ai, 'fixer');
        if (taskConfiguration.transport === 'cli') {
            try {
                const text = await new AgentCliClient().execute({ command: taskConfiguration.command!, prompt, timeoutMs: OPENCODE_REQUEST_TIMEOUT_MS });
                return { text, sessionId: 'cli' };
            } catch (error: unknown) {
                logError(`Error querying ${taskConfiguration.provider} CLI fixer: ${error instanceof Error ? error.message : String(error)}`);
                return undefined;
            }
        }
        const config = getValidatedOpenCodeConfig(ai);
        if (!config) return undefined;
        const { serverUrl, providerID, modelID, model } = config;
        try {
            return await withOpenCodeRetry(
                async () => {
                    const client = new OpenCodeHttpClient({ requestTimeoutMs: OPENCODE_REQUEST_TIMEOUT_MS });
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
