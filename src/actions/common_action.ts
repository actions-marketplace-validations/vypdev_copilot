import * as core from '@actions/core';
import { Execution } from '../data/model/execution';
import { Result } from '../data/model/result';
import { CommitUseCase } from '../application/usecases/commit_use_case';
import { ProjectBoardCommandPort } from '../application/ports/project_board_ports';
import { RepositoryFactory } from '../infrastructure/composition/repository_factory';
import { IssueCommentUseCase } from '../application/usecases/issue_comment_use_case';
import { PullRequestReviewCommentUseCase } from '../application/usecases/pull_request_review_comment_use_case';
import { SingleActionUseCase } from '../application/usecases/single_action_use_case';
import { clearAccumulatedLogs, logDebugInfo, logError, logInfo } from '../utils/logger';
import { TITLE } from '../utils/constants';
import chalk from 'chalk';
import boxen from 'boxen';
import { waitForPreviousRuns } from '../utils/queue_utils';
import { resolveMainRunRoute } from './main_run_route';

export async function mainRun(
    execution: Execution,
    projectBoardCommandPort: ProjectBoardCommandPort = new RepositoryFactory().createProjectBoardRepository(),
): Promise<Result[]> {
    const results: Result[] = [];

    logInfo('GitHub Action: starting main run.');
    logDebugInfo(`Event: ${execution.eventName}, actor: ${execution.actor}, repo: ${execution.owner}/${execution.repo}, debug: ${execution.debug}`);

    await execution.setup();
    clearAccumulatedLogs();

    logDebugInfo(`Setup done. Issue number: ${execution.issueNumber}, isSingleAction: ${execution.isSingleAction}, isIssue: ${execution.isIssue}, isPullRequest: ${execution.isPullRequest}, isPush: ${execution.isPush}`);

    if (!execution.welcome) {
        /**
         * Wait for previous runs to finish
         */
        await waitForPreviousRuns(execution).catch((err) => {
            logError(`Error waiting for previous runs: ${err}`);
            process.exit(1);
        });
    }
    
    if (execution.runnedByToken) {
        if (execution.isSingleAction && execution.singleAction.validSingleAction) {
            logInfo(`User from token (${execution.tokenUser}) matches actor. Executing single action: ${execution.singleAction.currentSingleAction}.`);
            results.push(...await new SingleActionUseCase(new RepositoryFactory().createInitialSetupUseCase()).invoke(execution));
            logInfo(`Single action finished. Results: ${results.length}.`);
            return results;
        }
        logInfo(`User from token (${execution.tokenUser}) matches actor. Ignoring (not a valid single action).`);
        return results;
    }

    if (execution.issueNumber === -1) {
        if (execution.isSingleAction && execution.singleAction.isSingleActionWithoutIssue) {
            logInfo('No issue number; running single action without issue.');
            results.push(...await new SingleActionUseCase(new RepositoryFactory().createInitialSetupUseCase()).invoke(execution));
        } else {
            logInfo('Issue number not found. Skipping.');
        }
        return results;
    }

    if (execution.welcome) {
        logInfo(
            boxen(
                chalk.cyan(execution.welcome.title) + '\n' +
                execution.welcome.messages.map(message => chalk.gray(message)).join('\n'),
                {
                    padding: 1,
                    margin: 1,
                    borderStyle: 'round',
                    borderColor: 'cyan',
                    title: TITLE,
                    titleAlignment: 'center'
                }
            )
        );
    }

    try {
        const route = resolveMainRunRoute({
            isSingleAction: execution.isSingleAction,
            isIssue: execution.isIssue,
            isIssueComment: execution.issue.isIssueComment,
            isPullRequest: execution.isPullRequest,
            isPullRequestReviewComment: execution.pullRequest.isPullRequestReviewComment,
            isPush: execution.isPush,
        });

        switch (route) {
            case 'single-action':
                logInfo(`Running SingleActionUseCase (action: ${execution.singleAction.currentSingleAction}).`);
                results.push(...await new SingleActionUseCase(new RepositoryFactory().createInitialSetupUseCase()).invoke(execution));
                break;
            case 'issue-comment':
                logInfo(`Running IssueCommentUseCase for issue #${execution.issue.number}.`);
                results.push(...await new IssueCommentUseCase().invoke(execution));
                break;
            case 'issue':
                logInfo(`Running IssueUseCase for issue #${execution.issueNumber}.`);
                results.push(...await new RepositoryFactory().createIssueUseCase().invoke(execution));
                break;
            case 'pull-request-review-comment':
                logInfo(`Running PullRequestReviewCommentUseCase for PR #${execution.pullRequest.number}.`);
                results.push(...await new PullRequestReviewCommentUseCase().invoke(execution));
                break;
            case 'pull-request':
                logInfo(`Running PullRequestUseCase for PR #${execution.pullRequest.number}.`);
                results.push(...await new RepositoryFactory().createPullRequestUseCase().invoke(execution));
                break;
            case 'push': {
                logDebugInfo(`Push event. Branch: ${execution.commit?.branch ?? 'unknown'}, commits: ${execution.commit?.commits?.length ?? 0}, issue number: ${execution.issueNumber}.`);
                logInfo('Running CommitUseCase.');
                const commitFactory = new RepositoryFactory();
                results.push(...await new CommitUseCase(
                    projectBoardCommandPort,
                    commitFactory.createIssueRepository(),
                    commitFactory.createPullRequestRepository(),
                ).invoke(execution));
                break;
            }
            case 'unhandled':
                logError(`Action not handled. Event: ${execution.eventName}.`);
                core.setFailed('Action not handled.');
                break;
        }

        const totalSteps = results.reduce((acc, r) => acc + (r.steps?.length ?? 0), 0);
        logInfo(`Main run finished. Results: ${results.length}, total steps: ${totalSteps}.`);
        return results;
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        logError(`Main run failed: ${msg}`, error instanceof Error ? { stack: (error as Error).stack } : undefined);
        core.setFailed(msg);
        return [];
    }
}

