import { Command } from 'commander';
import { runAgentAuthenticationPreflight } from '../../data/repository/agent_authentication_preflight';
import { createFixerQueryPort } from '../../infrastructure/composition/agent_capability_composition_root';
import { buildAgentTasks } from '../../actions/agent_configuration_builder';
import { getCliDoPrompt } from '../../prompts';
import { OPENCODE_DEFAULT_MODEL, TITLE } from '../../utils/constants';
import { logError } from '../../utils/logger';
import { OPENCODE_PROJECT_CONTEXT_INSTRUCTION } from '../../utils/opencode_project_context_instruction';
import { getGitInfo, getCurrentBranch } from '../../cli_context';
import { cleanCliArgument, joinCliArguments } from '../command_input_policy';

export function registerDoCommand(program: Command): void {
program
  .command('do')
  .description(`${TITLE} - AI development assistant (OpenCode build agent; can edit files when run locally)`)
  .option('-p, --prompt <prompt...>', 'Prompt or question (required)', '')
  .option('-d, --debug', 'Debug mode', false)
  .option('--opencode-server-url <url>', 'OpenCode server URL', process.env.OPENCODE_SERVER_URL || 'http://127.0.0.1:4096')
  .option('--opencode-model <model>', 'OpenCode model', process.env.OPENCODE_MODEL)
  .option('--agent-provider <provider>', 'Agent provider (opencode|cursor|codex)', process.env.AGENT_PROVIDER || 'opencode')
  .option('--agent-transport <transport>', 'Agent transport (server|cli)', process.env.AGENT_TRANSPORT || 'server')
  .option('--agent-model <model>', 'Selected agent model', process.env.AGENT_MODEL)
  .option('--agent-command <command>', 'CLI executable for the selected agent', process.env.AGENT_COMMAND)
  .option('--findings-provider <provider>', 'Findings agent provider', process.env.FINDINGS_PROVIDER)
  .option('--findings-transport <transport>', 'Findings agent transport', process.env.FINDINGS_TRANSPORT)
  .option('--findings-model <model>', 'Findings agent model', process.env.FINDINGS_MODEL)
  .option('--findings-command <command>', 'Findings CLI executable', process.env.FINDINGS_COMMAND)
  .option('--fixer-provider <provider>', 'Fixer agent provider', process.env.FIXER_PROVIDER)
  .option('--fixer-transport <transport>', 'Fixer agent transport', process.env.FIXER_TRANSPORT)
  .option('--fixer-model <model>', 'Fixer agent model', process.env.FIXER_MODEL)
  .option('--fixer-command <command>', 'Fixer CLI executable', process.env.FIXER_COMMAND)
  .option('--output <format>', 'Output format (text|json)', 'text')
  .action(async (options) => {
    const gitInfo = getGitInfo();
    if ('error' in gitInfo) {
      logError(gitInfo.error);
      process.exit(1);
    }

    const prompt = joinCliArguments(options.prompt);

    if (!prompt || prompt.length === 0) {
      console.log('❌ Please provide a prompt using -p or --prompt');
      return;
    }

    const serverUrl = cleanCliArgument(options.opencodeServerUrl) || process.env.OPENCODE_SERVER_URL || 'http://127.0.0.1:4096';
    const model = cleanCliArgument(options.opencodeModel) || process.env.OPENCODE_MODEL || OPENCODE_DEFAULT_MODEL;
    const agentProvider = cleanCliArgument(options.agentProvider) || process.env.AGENT_PROVIDER || 'opencode';
    const agentTransport = cleanCliArgument(options.agentTransport) || process.env.AGENT_TRANSPORT || 'server';
    const agentModel = cleanCliArgument(options.agentModel) || process.env.AGENT_MODEL || model;
    const agentCommand = cleanCliArgument(options.agentCommand) || process.env.AGENT_COMMAND;
    const agentTasks = buildAgentTasks({
      provider: agentProvider,
      transport: agentTransport,
      model: agentModel,
      serverUrl,
      command: agentCommand,
      findings: {
        provider: cleanCliArgument(options.findingsProvider), transport: cleanCliArgument(options.findingsTransport),
        model: cleanCliArgument(options.findingsModel), command: cleanCliArgument(options.findingsCommand),
      },
      fixer: {
        provider: cleanCliArgument(options.fixerProvider), transport: cleanCliArgument(options.fixerTransport),
        model: cleanCliArgument(options.fixerModel), command: cleanCliArgument(options.fixerCommand),
      },
    });
    const authPreflight = runAgentAuthenticationPreflight(agentTasks.findings);
    if (authPreflight.check.status === 'missing') {
      const message = `❌ ${authPreflight.check.message}`;
      if (authPreflight.shouldFail) {
        console.error(message);
        return;
      }
      if (authPreflight.mode === 'warn') console.warn(`⚠️ ${authPreflight.check.message}`);
    }
    const outputFormat = cleanCliArgument(options.output) || 'text';

    if (agentTasks.findings.transport === 'server' && !serverUrl) {
      console.log('❌ OpenCode server URL required for server transport. Set OPENCODE_SERVER_URL or use --opencode-server-url');
      return;
    }

    try {
      const aiRepository = createFixerQueryPort();
      const fullPrompt = getCliDoPrompt({
        projectContextInstruction: `${OPENCODE_PROJECT_CONTEXT_INSTRUCTION}\n\nRepository identity: ${gitInfo.owner}/${gitInfo.repo}\nCurrent branch: ${getCurrentBranch()}\nTreat this repository identity as authoritative context for the request.`,
        userPrompt: prompt,
      });
      const result = await aiRepository.fix({
        configuration: agentTasks.fixer,
        prompt: fullPrompt,
      });

      if (!result) {
        console.error('❌ Request failed (check OpenCode server and model).');
        process.exit(1);
      }

      const { text, sessionId } = result;

      if (outputFormat === 'json') {
        console.log(JSON.stringify({ response: text, sessionId }, null, 2));
        return;
      }

      console.log('\n' + '='.repeat(80));
      console.log('🤖 RESPONSE (OpenCode build agent)');
      console.log('='.repeat(80));
      console.log(`\n${text || '(No text response)'}\n`);
      console.log('Changes are applied directly in the workspace when OpenCode runs from the repo (e.g. opencode serve).');
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error('❌ Error executing do:', err.message || error);
      if (options.debug) {
        console.error(error);
      }
      process.exit(1);
    }
  });
}
