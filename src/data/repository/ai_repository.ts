import { OPENCODE_REQUEST_TIMEOUT_MS } from '../../utils/constants';
import { logDebugInfo, logError, logInfo } from '../../utils/logger';
import { Ai } from '../model/ai';
import { AgentCliClient } from './agent_cli_client';
import { ProviderCliAdapter } from './provider_cli_adapter';
import { OpenCodeHttpClient } from './opencode_http_client';
import type { AgentQueryOptions, FindingsQueryPort, FixerQueryPort } from '../../application/ports/agent_ports';
import type { AgentCliPort, OpenCodeClientPort } from '../../infrastructure/agents/ports/agent_provider_ports';
import { OpenCodeAgentInvoker } from './opencode_agent_invoker';
import { buildAgentPrompt } from './agent_prompt_policy';
import { getValidatedAgentConfiguration, isValidServerAgentConfiguration } from './agent_configuration_policy';
import { executeAgentRequest } from './agent_execution_policy';
import { interpretFixerResponse } from './agent_fixer_response_policy';
import { interpretFindingsResponse } from './agent_findings_response_policy';
import { extractTextFromParts } from './agent_response_parser';
export { LANGUAGE_CHECK_RESPONSE_SCHEMA, THINK_RESPONSE_SCHEMA, TRANSLATION_RESPONSE_SCHEMA } from './agent_response_schemas';

export const OPENCODE_AGENT_PLAN = 'build';
export const OPENCODE_AGENT_BUILD = 'build';
export type AskAgentOptions = AgentQueryOptions;

export class AiRepository implements FindingsQueryPort, FixerQueryPort {
    private readonly cliAdapter: ProviderCliAdapter;
    private readonly openCodeInvoker: OpenCodeAgentInvoker;

    constructor(
        cliClient: AgentCliPort = new AgentCliClient(),
        openCodeClient: OpenCodeClientPort = new OpenCodeHttpClient({ requestTimeoutMs: OPENCODE_REQUEST_TIMEOUT_MS }),
    ) {
        this.cliAdapter = new ProviderCliAdapter(cliClient);
        this.openCodeInvoker = new OpenCodeAgentInvoker(openCodeClient);
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
                if (options.expectJson && options.schema) return interpretFindingsResponse(output, options);
                return output;
            } catch (error: unknown) {
                logError(`Error querying ${taskConfiguration.provider} CLI: ${error instanceof Error ? error.message : String(error)}`);
                return undefined;
            }
        }
        if (!isValidServerAgentConfiguration(taskConfiguration)) {
            logError('Missing required AI configuration for findings server transport.');
            return undefined;
        }
        try {
            return await executeAgentRequest({
                configuration: taskConfiguration,
                prompt: promptText,
                agent: agentId,
                timeoutMs: OPENCODE_REQUEST_TIMEOUT_MS,
                cliAdapter: this.cliAdapter,
                openCodeInvoker: this.openCodeInvoker,
                mapCliOutput: (output) => interpretFindingsResponse(output, options),
                mapServerResponse: ({ parts }) => {
                    const result = interpretFindingsResponse(parts, options);
                    if (options.expectJson && options.schema) {
                        const text = extractTextFromParts(parts);
                        logInfo(`OpenCode agent response (expectJson=true) length=${text.length}`);
                        logDebugInfo(`OpenCode agent response (full text, no truncation) length=${text.length}:\\n${text}`);
                    }
                    return result;
                },
            });
        } catch (error: unknown) {
            const err = error instanceof Error ? error : new Error(String(error));
            const cause = (err as Error & { cause?: unknown }).cause;
            const detail = cause != null ? ` (${cause instanceof Error ? cause.message : String(cause)})` : '';
            logError(`Error querying OpenCode agent ${agentId} (${taskConfiguration.model}): ${err.message}${detail}`);
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
        if (!isValidServerAgentConfiguration(taskConfiguration)) {
            logError('Missing required AI configuration for fixer server transport.');
            return undefined;
        }
        try {
            return await executeAgentRequest({
                configuration: taskConfiguration,
                prompt,
                agent: OPENCODE_AGENT_BUILD,
                timeoutMs: OPENCODE_REQUEST_TIMEOUT_MS,
                cliAdapter: this.cliAdapter,
                openCodeInvoker: this.openCodeInvoker,
                mapCliOutput: (text) => ({ text, sessionId: 'cli' }),
                mapServerResponse: (result) => interpretFixerResponse(result.parts, result.sessionId),
            });
        } catch (error: unknown) {
            const err = error instanceof Error ? error : new Error(String(error));
            logError(`Error querying OpenCode build agent (${taskConfiguration.model}): ${err.message}`);
            return undefined;
        }
    };
}
