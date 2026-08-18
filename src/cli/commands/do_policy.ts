import { buildAgentTasks } from '../../actions/agent_configuration_builder';
import type { AgentTaskConfiguration } from '../../data/model/agent';
import { OPENCODE_DEFAULT_MODEL } from '../../utils/constants';
import { cleanCliArgument } from '../command_input_policy';

export interface DoAgentOptions {
  opencodeServerUrl?: string;
  opencodeModel?: string;
  agentProvider?: string;
  agentTransport?: string;
  agentModel?: string;
  agentCommand?: string;
  findingsProvider?: string;
  findingsTransport?: string;
  findingsModel?: string;
  findingsCommand?: string;
  fixerProvider?: string;
  fixerTransport?: string;
  fixerModel?: string;
  fixerCommand?: string;
}

export function buildDoAgentTasks(options: DoAgentOptions): AgentTaskConfiguration {
  const serverUrl = cleanCliArgument(options.opencodeServerUrl) || process.env.OPENCODE_SERVER_URL || 'http://127.0.0.1:4096';
  const model = cleanCliArgument(options.opencodeModel) || process.env.OPENCODE_MODEL || OPENCODE_DEFAULT_MODEL;
  const provider = cleanCliArgument(options.agentProvider) || process.env.AGENT_PROVIDER || 'opencode';
  const transport = cleanCliArgument(options.agentTransport) || process.env.AGENT_TRANSPORT || 'server';
  return buildAgentTasks({
    provider,
    transport,
    model: cleanCliArgument(options.agentModel) || process.env.AGENT_MODEL || model,
    serverUrl,
    command: cleanCliArgument(options.agentCommand) || process.env.AGENT_COMMAND,
    findings: {
      provider: cleanCliArgument(options.findingsProvider), transport: cleanCliArgument(options.findingsTransport),
      model: cleanCliArgument(options.findingsModel), command: cleanCliArgument(options.findingsCommand),
    },
    fixer: {
      provider: cleanCliArgument(options.fixerProvider), transport: cleanCliArgument(options.fixerTransport),
      model: cleanCliArgument(options.fixerModel), command: cleanCliArgument(options.fixerCommand),
    },
  });
}

export function formatDoJsonResponse(text: string | undefined, sessionId?: string): string {
  return JSON.stringify({ response: text, sessionId }, null, 2);
}
