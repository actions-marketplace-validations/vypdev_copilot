import * as core from '@actions/core';
import { Execution } from '../data/model/execution';
import { Result } from '../data/model/result';
import { CommitUseCase } from '../application/usecases/commit_use_case';
import { NotifyNewCommitOnIssueUseCase } from '../application/usecases/steps/commit/notify_new_commit_on_issue_use_case';
import { CheckChangesIssueSizeUseCase } from '../application/usecases/steps/commit/check_changes_issue_size_use_case';
import { DetectPotentialProblemsUseCase } from '../application/usecases/steps/commit/detect_potential_problems_use_case';
import { BugbotAutofixUseCase } from '../application/usecases/steps/commit/bugbot/bugbot_autofix_use_case';
import { DetectBugbotFixIntentUseCase } from '../application/usecases/steps/commit/bugbot/detect_bugbot_fix_intent_use_case';
import { DoUserRequestUseCase } from '../application/usecases/steps/commit/user_request_use_case';
import { ProjectBoardCommandPort } from '../application/ports/project_board_ports';
import { RepositoryFactory } from '../infrastructure/composition/repository_factory';
import { IssueCommentUseCase } from '../application/usecases/issue_comment_use_case';
import { CheckIssueCommentLanguageUseCase } from '../application/usecases/steps/issue_comment/check_issue_comment_language_use_case';
import { PullRequestReviewCommentUseCase } from '../application/usecases/pull_request_review_comment_use_case';
import { CheckPullRequestCommentLanguageUseCase } from '../application/usecases/steps/pull_request_review_comment/check_pull_request_comment_language_use_case';
import { SingleActionUseCase } from '../application/usecases/single_action_use_case';
import { DeployedActionUseCase } from '../application/usecases/actions/deployed_action_use_case';
import { PublishGithubActionUseCase } from '../application/usecases/actions/publish_github_action_use_case';
import { CreateReleaseUseCase } from '../application/usecases/actions/create_release_use_case';
import { CreateTagUseCase } from '../application/usecases/actions/create_tag_use_case';
import { ThinkUseCase } from '../application/usecases/steps/common/think_use_case';
import { RecommendStepsUseCase } from '../application/usecases/actions/recommend_steps_use_case';
import { DefaultAgentRepositoryFactory } from '../data/repository/agent_repository_factory';
import type { BugbotContextPorts, BugbotWritePorts } from '../application/ports/bugbot_ports';
import { clearAccumulatedLogs, logDebugInfo, logError, logInfo } from '../utils/logger';
import { TITLE } from '../utils/constants';
import chalk from 'chalk';
import boxen from 'boxen';
import { waitForPreviousRuns } from '../utils/queue_utils';
import { resolveMainRunRoute } from './main_run_route';

function createDetectPotentialProblemsUseCase(factory: RepositoryFactory): DetectPotentialProblemsUseCase {
    const issueRepository = factory.createIssueRepository();
    const pullRequestRepository = factory.createPullRequestRepository();
    const contextPorts: BugbotContextPorts = { issue: issueRepository, pullRequest: pullRequestRepository };
    const writePorts: BugbotWritePorts = { issueComments: issueRepository, pullRequestComments: pullRequestRepository };
    return new DetectPotentialProblemsUseCase(
        new DefaultAgentRepositoryFactory().createFindings(),
        contextPorts,
        writePorts,
    );
}

function createBugbotContextPorts(factory: RepositoryFactory) {
    return {
        issue: factory.createIssueRepository(),
        pullRequest: factory.createPullRequestRepository(),
    };
}

function createDetectBugbotFixIntentUseCase(factory: RepositoryFactory): DetectBugbotFixIntentUseCase {
    const contextPorts = createBugbotContextPorts(factory);
    return new DetectBugbotFixIntentUseCase(
        contextPorts.pullRequest,
        new DefaultAgentRepositoryFactory().createFindings(),
        contextPorts,
    );
}

function createSingleActionUseCase(factory: RepositoryFactory): SingleActionUseCase {
    const repositoryReleasePort = factory.createRepositoryReleaseRepository();
    const issueDescriptionQueryPort = factory.createIssueRepository();
    return new SingleActionUseCase(
        new DeployedActionUseCase(
            factory.createIssueRepository(),
            factory.createIssueRepository(),
            factory.createBranchRepository(),
        ),
        new PublishGithubActionUseCase(repositoryReleasePort),
        new CreateReleaseUseCase(repositoryReleasePort),
        new CreateTagUseCase(repositoryReleasePort),
        new ThinkUseCase(issueDescriptionQueryPort, factory.createIssueRepository(), new DefaultAgentRepositoryFactory().createFindings()),
        factory.createInitialSetupUseCase(),
        factory.createCheckProgressUseCase(),
        createDetectPotentialProblemsUseCase(factory),
        new RecommendStepsUseCase(issueDescriptionQueryPort),
    );
}

export async function mainRun(
    execution: Execution,
    projectBoardCommandPort: ProjectBoardCommandPort = new RepositoryFactory().createProjectBoardRepository(),
): Promise<Result[]> {
    const results: Result[] = [];

    logInfo('GitHub Action: starting main run.');
    logDebugInfo(`Event: ${execution.eventName}, actor: ${execution.actor}, repo: ${execution.owner}/${execution.repo}, debug: ${execution.debug}`);

    await execution.setup(new RepositoryFactory().createBranchRepository());
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
            const singleActionFactory = new RepositoryFactory();
            results.push(...await createSingleActionUseCase(singleActionFactory).invoke(execution));
            logInfo(`Single action finished. Results: ${results.length}.`);
            return results;
        }
        logInfo(`User from token (${execution.tokenUser}) matches actor. Ignoring (not a valid single action).`);
        return results;
    }

    if (execution.issueNumber === -1) {
        if (execution.isSingleAction && execution.singleAction.isSingleActionWithoutIssue) {
            logInfo('No issue number; running single action without issue.');
            const singleActionFactory = new RepositoryFactory();
            results.push(...await createSingleActionUseCase(singleActionFactory).invoke(execution));
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
            case 'single-action': {
                logInfo(`Running SingleActionUseCase (action: ${execution.singleAction.currentSingleAction}).`);
                const singleActionFactory = new RepositoryFactory();
                results.push(...await createSingleActionUseCase(singleActionFactory).invoke(execution));
                break;
            }
            case 'issue-comment': {
                logInfo(`Running IssueCommentUseCase for issue #${execution.issue.number}.`);
                const commentFactory = new RepositoryFactory();
                results.push(...await new IssueCommentUseCase(
                    new CheckIssueCommentLanguageUseCase(
                        commentFactory.createIssueRepository(),
                        new DefaultAgentRepositoryFactory().createFindings(),
                    ),
                    createDetectBugbotFixIntentUseCase(commentFactory),
                    new ThinkUseCase(commentFactory.createIssueRepository(), commentFactory.createIssueRepository(), new DefaultAgentRepositoryFactory().createFindings()),
                    new BugbotAutofixUseCase(new DefaultAgentRepositoryFactory().createFixer(), createBugbotContextPorts(commentFactory)),
                    new DoUserRequestUseCase(new DefaultAgentRepositoryFactory().createFixer()),
                    commentFactory.createIssueRepository(),
                    commentFactory.createOrganizationRepository(),
                    commentFactory.createOrganizationRepository(),
                    {
                        issueComments: commentFactory.createIssueRepository(),
                        pullRequestComments: commentFactory.createPullRequestRepository(),
                    },
                ).invoke(execution));
                break;
            }
            case 'issue':
                logInfo(`Running IssueUseCase for issue #${execution.issueNumber}.`);
                results.push(...await new RepositoryFactory().createIssueUseCase().invoke(execution));
                break;
            case 'pull-request-review-comment': {
                logInfo(`Running PullRequestReviewCommentUseCase for PR #${execution.pullRequest.number}.`);
                const reviewCommentFactory = new RepositoryFactory();
                results.push(...await new PullRequestReviewCommentUseCase(
                    new CheckPullRequestCommentLanguageUseCase(
                        reviewCommentFactory.createIssueRepository(),
                        new DefaultAgentRepositoryFactory().createFindings(),
                    ),
                    createDetectBugbotFixIntentUseCase(reviewCommentFactory),
                    new ThinkUseCase(reviewCommentFactory.createIssueRepository(), reviewCommentFactory.createIssueRepository(), new DefaultAgentRepositoryFactory().createFindings()),
                    new BugbotAutofixUseCase(new DefaultAgentRepositoryFactory().createFixer(), createBugbotContextPorts(reviewCommentFactory)),
                    new DoUserRequestUseCase(new DefaultAgentRepositoryFactory().createFixer()),
                    reviewCommentFactory.createIssueRepository(),
                    reviewCommentFactory.createOrganizationRepository(),
                    reviewCommentFactory.createOrganizationRepository(),
                    {
                        issueComments: reviewCommentFactory.createIssueRepository(),
                        pullRequestComments: reviewCommentFactory.createPullRequestRepository(),
                    },
                ).invoke(execution));
                break;
            }
            case 'pull-request':
                logInfo(`Running PullRequestUseCase for PR #${execution.pullRequest.number}.`);
                results.push(...await new RepositoryFactory().createPullRequestUseCase().invoke(execution));
                break;
            case 'push': {
                logDebugInfo(`Push event. Branch: ${execution.commit?.branch ?? 'unknown'}, commits: ${execution.commit?.commits?.length ?? 0}, issue number: ${execution.issueNumber}.`);
                logInfo('Running CommitUseCase.');
                const commitFactory = new RepositoryFactory();
                results.push(...await new CommitUseCase(
                    new NotifyNewCommitOnIssueUseCase(commitFactory.createIssueRepository()),
                    new CheckChangesIssueSizeUseCase(
                        projectBoardCommandPort,
                        commitFactory.createIssueRepository(),
                        commitFactory.createPullRequestRepository(),
                        commitFactory.createBranchRepository(),
                    ),
                    createDetectPotentialProblemsUseCase(commitFactory),
                    commitFactory.createCheckProgressUseCase(),
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

