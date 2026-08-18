import { Command } from 'commander';
import { runLocalAction } from '../../actions/local_action';
import { ACTIONS, INPUT_KEYS, OPENCODE_DEFAULT_MODEL, TITLE } from '../../utils/constants';
import { logError } from '../../utils/logger';
import { getGitInfo } from '../../cli_context';
import { cleanCliArgument, parsePositiveCliInteger } from '../command_input_policy';

export function registerRecommendStepsCommand(program: Command): void {
program
  .command('recommend-steps')
  .description(`${TITLE} - Recommend steps to implement an issue (OpenCode Plan agent)`)
  .option('-i, --issue <number>', 'Issue number (required)', '')
  .option('-d, --debug', 'Debug mode', false)
  .option('-t, --token <token>', 'Personal access token', process.env.PERSONAL_ACCESS_TOKEN)
  .option('--opencode-server-url <url>', 'OpenCode server URL', process.env.OPENCODE_SERVER_URL || 'http://127.0.0.1:4096')
  .option('--opencode-model <model>', 'OpenCode model', process.env.OPENCODE_MODEL)
  .action(async (options) => {
    const gitInfo = getGitInfo();
    if ('error' in gitInfo) {
      logError(gitInfo.error);
      process.exit(1);
    }
    const issueNumber = cleanCliArgument(options.issue);
    const parsedIssueNumber = parsePositiveCliInteger(issueNumber);
    if (parsedIssueNumber === undefined) {
      console.log('❌ Provide a valid issue number with -i or --issue');
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- CLI options map to action inputs
    const params: any = {
      [INPUT_KEYS.DEBUG]: options.debug?.toString() ?? 'false',
      [INPUT_KEYS.SINGLE_ACTION]: ACTIONS.RECOMMEND_STEPS,
      [INPUT_KEYS.SINGLE_ACTION_ISSUE]: parsedIssueNumber,
      [INPUT_KEYS.TOKEN]: options.token || process.env.PERSONAL_ACCESS_TOKEN,
      [INPUT_KEYS.OPENCODE_SERVER_URL]: options.opencodeServerUrl || process.env.OPENCODE_SERVER_URL || 'http://127.0.0.1:4096',
      [INPUT_KEYS.OPENCODE_MODEL]: options.opencodeModel || process.env.OPENCODE_MODEL || OPENCODE_DEFAULT_MODEL,
      repo: { owner: gitInfo.owner, repo: gitInfo.repo },
      issue: { number: parseInt(issueNumber) },
    };
    params[INPUT_KEYS.WELCOME_TITLE] = '📋 Recommend steps';
    params[INPUT_KEYS.WELCOME_MESSAGES] = [`Recommending steps for issue #${issueNumber} in ${gitInfo.owner}/${gitInfo.repo}...`];
    await runLocalAction(params);
  });
}
