import { Command } from 'commander';
import { runLocalAction } from '../../actions/local_action';
import { ACTIONS, INPUT_KEYS, OPENCODE_DEFAULT_MODEL, TITLE } from '../../utils/constants';
import { logError } from '../../utils/logger';
import { getGitInfo } from '../../cli_context';

export function registerCheckProgressCommand(program: Command): void {
program
  .command('check-progress')
  .description(`${TITLE} - Check progress of an issue based on code changes`)
  .option('-i, --issue <number>', 'Issue number to check progress for (required)', '')
  .option('-b, --branch <name>', 'Branch name (optional, will try to determine from issue)')
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

    // Helper function to clean CLI arguments that may have '=' prefix
    const cleanArg = (value: unknown): string => {
      if (value == null) return '';
      const str = String(value);
      return str.startsWith('=') ? str.substring(1) : str;
    };

    const issueNumber = cleanArg(options.issue);

    if (!issueNumber || issueNumber.length === 0) {
      console.log('❌ Please provide an issue number using -i or --issue');
      return;
    }

    const parsedIssueNumber = parseInt(issueNumber);
    if (isNaN(parsedIssueNumber) || parsedIssueNumber <= 0) {
      console.log(`❌ Invalid issue number: ${issueNumber}. Must be a positive number.`);
      return;
    }

    const branch = cleanArg(options.branch);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- CLI options map to action inputs
    const params: any = {
      [INPUT_KEYS.DEBUG]: options.debug.toString(),
      [INPUT_KEYS.SINGLE_ACTION]: ACTIONS.CHECK_PROGRESS,
      [INPUT_KEYS.SINGLE_ACTION_ISSUE]: parsedIssueNumber,
      [INPUT_KEYS.TOKEN]: options.token || process.env.PERSONAL_ACCESS_TOKEN,
      [INPUT_KEYS.OPENCODE_SERVER_URL]: options.opencodeServerUrl || process.env.OPENCODE_SERVER_URL || 'http://127.0.0.1:4096',
      [INPUT_KEYS.OPENCODE_MODEL]: options.opencodeModel || process.env.OPENCODE_MODEL || OPENCODE_DEFAULT_MODEL,
      [INPUT_KEYS.AI_IGNORE_FILES]: process.env.AI_IGNORE_FILES || 'build/*,dist/*,node_modules/*,*.d.ts',
      repo: {
        owner: gitInfo.owner,
        repo: gitInfo.repo,
      },
      issue: {
        number: parsedIssueNumber,
      },
    };

    // Set branch if provided
    if (branch && branch.length > 0) {
      params.commits = {
        ref: `refs/heads/${branch}`,
      };
    }

    params[INPUT_KEYS.WELCOME_TITLE] = '📊 Progress Check';
    params[INPUT_KEYS.WELCOME_MESSAGES] = [
      `Checking progress for issue #${parsedIssueNumber} in ${gitInfo.owner}/${gitInfo.repo}...`,
    ];

    try {
      await runLocalAction(params);
      process.exit(0);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('❌ Error checking progress:', error.message);
      if (options.debug) {
        console.error(err);
      }
      process.exit(1);
    }
  });
}
