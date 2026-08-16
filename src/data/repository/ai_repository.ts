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
import { resolveOpenCodeModelReference } from './opencode_model_reference_policy';
import { extractReasoningFromParts, extractTextFromParts } from './agent_response_parser';
export { getSessionDiff } from './opencode_session_diff_client';
export type { OpenCodeFileDiff } from './opencode_session_diff_client';
export { LANGUAGE_CHECK_RESPONSE_SCHEMA, THINK_RESPONSE_SCHEMA, TRANSLATION_RESPONSE_SCHEMA } from './agent_response_schemas';

export const OPENCODE_AGENT_PLAN = 'build';
export const OPENCODE_AGENT_BUILD = 'build';
export type AskAgentOptions = AgentQueryOptions;

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
        const { providerId, modelId } = resolveOpenCodeModelReference(taskConfiguration.model);
        const serverUrl = taskConfiguration.serverUrl;
        const model = taskConfiguration.model;
        try {
            return await withOpenCodeRetry(async () => {
                const client = this.openCodeClient;
                const { parts } = await client.sendMessage({
                    serverUrl,
                    providerID: providerId,
                    modelID: modelId,
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
        const { providerId, modelId } = resolveOpenCodeModelReference(taskConfiguration.model);
        const serverUrl = taskConfiguration.serverUrl;
        const model = taskConfiguration.model;
        try {
            return await withOpenCodeRetry(
                async () => {
                    const client = this.openCodeClient;
                    const result = await client.sendMessage({
                        serverUrl,
                        providerID: providerId,
                        modelID: modelId,
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
