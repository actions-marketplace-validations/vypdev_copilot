import { Command } from 'commander';
import { runLocalAction } from '../../actions/local_action';
import { ACTIONS, INPUT_KEYS, TITLE } from '../../utils/constants';
import { getSetupToken, setupEnvFileExists } from '../../utils/setup_files';
import { logError, logInfo } from '../../utils/logger';
import { getGitInfo, isInsideGitRepo } from '../../cli_context';

export function registerSetupCommand(program: Command): void {
program
  .command('setup')
  .description(`${TITLE} - Initial setup: create labels, issue types, and verify access`)
  .option('-d, --debug', 'Debug mode', false)
  .option('-t, --token <token>', 'Personal access token', process.env.PERSONAL_ACCESS_TOKEN)
  .action(async (options) => {
    const cwd = process.cwd();

    logInfo('🔍 Checking we are inside a git repository...');
    if (!isInsideGitRepo(cwd)) {
      logError('❌ Not a git repository. Run "copilot setup" from the root of a git repo.');
      process.exit(1);
    }
    logInfo('✅ Git repository detected.');

    logInfo('🔗 Resolving repository (owner/repo)...');
    const gitInfo = getGitInfo();
    if ('error' in gitInfo) {
      logError(gitInfo.error);
      process.exit(1);
    }
    logInfo(`📦 Repository: ${gitInfo.owner}/${gitInfo.repo}`);

    const token = getSetupToken(cwd, options.token);
    if (!token) {
      logError('🛑 Setup requires PERSONAL_ACCESS_TOKEN with a valid token.');
      logInfo('   You can:');
      logInfo('   • Pass it on the command line: copilot setup --token <your_github_token>');
      logInfo('   • Add it to your environment: export PERSONAL_ACCESS_TOKEN=your_github_token');
      if (setupEnvFileExists(cwd)) {
        logInfo('   • Or add PERSONAL_ACCESS_TOKEN=your_github_token to your existing .env file');
      } else {
        logInfo('   • Or create a .env file in this repo with: PERSONAL_ACCESS_TOKEN=your_github_token');
      }
      process.exit(1);
      return;
    }

    logInfo('⚙️  Running initial setup (labels, issue types, access)...');

    const params: any = { // eslint-disable-line @typescript-eslint/no-explicit-any -- CLI options map to action inputs
      [INPUT_KEYS.DEBUG]: options.debug.toString(),
      [INPUT_KEYS.SINGLE_ACTION]: ACTIONS.INITIAL_SETUP,
      [INPUT_KEYS.SINGLE_ACTION_ISSUE]: 1,
      [INPUT_KEYS.TOKEN]: token,
      repo: {
        owner: gitInfo.owner,
        repo: gitInfo.repo,
      },
      issue: {
        number: 1,
      },
    };

    params[INPUT_KEYS.WELCOME_TITLE] = '⚙️  Initial Setup';
    params[INPUT_KEYS.WELCOME_MESSAGES] = [
      `Running initial setup for ${gitInfo.owner}/${gitInfo.repo}...`,
      'This will create labels, issue types, and verify access to GitHub.',
    ];

    await runLocalAction(params);
  });
}
