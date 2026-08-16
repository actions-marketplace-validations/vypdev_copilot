import type { AgentConfiguration } from '../model/agent';
import type { ProviderCliExecution } from './provider_cli_adapter';
import { resolveOpenCodeModelReference } from './opencode_model_reference_policy';
import type { OpenCodeAgentInvoker, OpenCodeAgentResponse } from './opencode_agent_invoker';
import type { ProviderCliAdapter } from './provider_cli_adapter';

export interface AgentExecutionPolicyRequest<TResult> {
    configuration: AgentConfiguration;
    prompt: string;
    agent: string;
    timeoutMs: number;
    cliAdapter: ProviderCliAdapter;
    openCodeInvoker: OpenCodeAgentInvoker;
    mapCliOutput: (output: string) => TResult | Promise<TResult>;
    mapServerResponse: (response: OpenCodeAgentResponse) => TResult | Promise<TResult>;
}

export async function executeAgentRequest<TResult>(request: AgentExecutionPolicyRequest<TResult>): Promise<TResult> {
    if (request.configuration.transport === 'cli') {
        const cliRequest: ProviderCliExecution = {
            configuration: request.configuration,
            prompt: request.prompt,
            timeoutMs: request.timeoutMs,
        };
        return request.cliAdapter.execute(cliRequest).then(request.mapCliOutput);
    }

    if (request.configuration.provider !== 'opencode') {
        throw new Error(`Agent server transport is not implemented for ${request.configuration.provider}. Use cli.`);
    }
    if (!request.configuration.serverUrl || !request.configuration.model.trim()) {
        throw new Error('Missing required AI configuration for server transport.');
    }

    const { providerId, modelId } = resolveOpenCodeModelReference(request.configuration.model);
    return request.openCodeInvoker.invoke(
        {
            serverUrl: request.configuration.serverUrl,
            providerID: providerId,
            modelID: modelId,
            agent: request.agent,
            prompt: request.prompt,
        },
        `agent ${request.agent}`,
        request.mapServerResponse,
    );
}
