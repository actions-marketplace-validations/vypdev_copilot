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
import { GitCommitAdapter } from '../infrastructure/git_commit_adapter';
import type { MainRunRoute } from './main_run_route';
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
import { logDebugInfo, logError, logInfo } from '../utils/logger';

export async function dispatchMainRunRoute(
    route: MainRunRoute,
    execution: Execution,
    projectBoardCommandPort: ProjectBoardCommandPort,
    factory: RepositoryFactory,
): Promise<Result[]> {
    const results: Result[] = [];

    function createDetectPotentialProblemsUseCase(factory: RepositoryFactory): DetectPotentialProblemsUseCase {
        const issueRepository = factory.createBugbotIssueRepository();
        const pullRequestRepository = factory.createBugbotPullRequestRepository();
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
            issue: factory.createBugbotIssueRepository(),
            pullRequest: factory.createBugbotPullRequestRepository(),
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
        const issueDescriptionQueryPort = factory.createIssueContentRepository();
        return new SingleActionUseCase(
            new DeployedActionUseCase(
                factory.createIssueLabelRepository(),
                factory.createIssueClosureRepository(),
                factory.createMergeRepository(),
            ),
            new PublishGithubActionUseCase(repositoryReleasePort),
            new CreateReleaseUseCase(repositoryReleasePort),
            new CreateTagUseCase(repositoryReleasePort),
            new ThinkUseCase(issueDescriptionQueryPort, factory.createIssueNotificationRepository(), new DefaultAgentRepositoryFactory().createFindings()),
            factory.createInitialSetupUseCase(),
            factory.createCheckProgressUseCase(),
            createDetectPotentialProblemsUseCase(factory),
            new RecommendStepsUseCase(issueDescriptionQueryPort, new DefaultAgentRepositoryFactory().createFindings()),
        );
    }

            switch (route) {
                case 'single-action': {
                    logInfo(`Running SingleActionUseCase (action: ${execution.singleAction.currentSingleAction}).`);
                    const singleActionFactory = factory;
                    results.push(...await createSingleActionUseCase(singleActionFactory).invoke(execution));
                    break;
                }
                case 'issue-comment': {
                    logInfo(`Running IssueCommentUseCase for issue #${execution.issue.number}.`);
                    const commentFactory = factory;
                    results.push(...await new IssueCommentUseCase(
                        new CheckIssueCommentLanguageUseCase(
                            commentFactory.createBugbotIssueRepository(),
                            new DefaultAgentRepositoryFactory().createFindings(),
                        ),
                        createDetectBugbotFixIntentUseCase(commentFactory),
                        new ThinkUseCase(commentFactory.createIssueContentRepository(), commentFactory.createIssueNotificationRepository(), new DefaultAgentRepositoryFactory().createFindings()),
                        new BugbotAutofixUseCase(new DefaultAgentRepositoryFactory().createFixer(), createBugbotContextPorts(commentFactory), new GitCommitAdapter()),
                        new DoUserRequestUseCase(new DefaultAgentRepositoryFactory().createFixer()),
                        commentFactory.createBugbotIssueRepository(),
                        commentFactory.createActorAuthorizationRepository(),
                        commentFactory.createAuthenticatedUserRepository(),
                        {
                            issueComments: commentFactory.createBugbotIssueRepository(),
                            pullRequestComments: commentFactory.createBugbotPullRequestRepository(),
                        },
                        new GitCommitAdapter(),
                    ).invoke(execution));
                    break;
                }
                case 'issue':
                    logInfo(`Running IssueUseCase for issue #${execution.issueNumber}.`);
                    results.push(...await factory.createIssueUseCase().invoke(execution));
                    break;
                case 'pull-request-review-comment': {
                    logInfo(`Running PullRequestReviewCommentUseCase for PR #${execution.pullRequest.number}.`);
                    const reviewCommentFactory = factory;
                    results.push(...await new PullRequestReviewCommentUseCase(
                        new CheckPullRequestCommentLanguageUseCase(
                            reviewCommentFactory.createBugbotIssueRepository(),
                            new DefaultAgentRepositoryFactory().createFindings(),
                        ),
                        createDetectBugbotFixIntentUseCase(reviewCommentFactory),
                        new ThinkUseCase(reviewCommentFactory.createIssueContentRepository(), reviewCommentFactory.createIssueNotificationRepository(), new DefaultAgentRepositoryFactory().createFindings()),
                        new BugbotAutofixUseCase(new DefaultAgentRepositoryFactory().createFixer(), createBugbotContextPorts(reviewCommentFactory), new GitCommitAdapter()),
                        new DoUserRequestUseCase(new DefaultAgentRepositoryFactory().createFixer()),
                        reviewCommentFactory.createBugbotIssueRepository(),
                        reviewCommentFactory.createActorAuthorizationRepository(),
                        reviewCommentFactory.createAuthenticatedUserRepository(),
                        {
                            issueComments: reviewCommentFactory.createBugbotIssueRepository(),
                            pullRequestComments: reviewCommentFactory.createBugbotPullRequestRepository(),
                        },
                        new GitCommitAdapter(),
                    ).invoke(execution));
                    break;
                }
                case 'pull-request':
                    logInfo(`Running PullRequestUseCase for PR #${execution.pullRequest.number}.`);
                    results.push(...await factory.createPullRequestUseCase().invoke(execution));
                    break;
                case 'push': {
                    logDebugInfo(`Push event. Branch: ${execution.commit?.branch ?? 'unknown'}, commits: ${execution.commit?.commits?.length ?? 0}, issue number: ${execution.issueNumber}.`);
                    logInfo('Running CommitUseCase.');
                    const commitFactory = factory;
                    results.push(...await new CommitUseCase(
                        new NotifyNewCommitOnIssueUseCase(commitFactory.createIssueNotificationRepository()),
                        new CheckChangesIssueSizeUseCase(
                            projectBoardCommandPort,
                            commitFactory.createIssueLabelRepository(),
                            commitFactory.createPullRequestLifecycleRepository(),
                            commitFactory.createBranchCompareRepository(),
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

    return results;
}
