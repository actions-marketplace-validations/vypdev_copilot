import { createCheckProgressCompositionRoot } from '../infrastructure/composition/check_progress_composition_root';
import { createBugbotCompositionRoot } from '../infrastructure/composition/bugbot_composition_root';
import { createPullRequestUseCaseCompositionRoot } from '../infrastructure/composition/pull_request_use_case_composition_root';
import * as core from '@actions/core';
import { Execution } from '../data/model/execution';
import { Result } from '../data/model/result';
import { CommitUseCase } from '../application/usecases/commit_use_case';
import { NotifyNewCommitOnIssueUseCase } from '../application/usecases/steps/commit/notify_new_commit_on_issue_use_case';
import { CheckChangesIssueSizeUseCase } from '../application/usecases/steps/commit/check_changes_issue_size_use_case';
import { BugbotAutofixUseCase } from '../application/usecases/steps/commit/bugbot/bugbot_autofix_use_case';
import { DoUserRequestUseCase } from '../application/usecases/steps/commit/user_request_use_case';
import { ProjectBoardCommandPort } from '../application/ports/project_board_ports';
import { RepositoryFactory } from '../infrastructure/composition/repository_factory';
import { createAuthenticatedUserCompositionRoot } from '../infrastructure/composition/authenticated_user_composition_root';
import { GitCommitAdapter } from '../infrastructure/git_commit_adapter';
import type { MainRunRoute } from './main_run_route';
import { createDetectPotentialProblemsUseCase, createDetectBugbotFixIntentUseCase, createSingleActionUseCase } from './main_run_composition';
import { IssueCommentUseCase } from '../application/usecases/issue_comment_use_case';
import { CheckIssueCommentLanguageUseCase } from '../application/usecases/steps/issue_comment/check_issue_comment_language_use_case';
import { PullRequestReviewCommentUseCase } from '../application/usecases/pull_request_review_comment_use_case';
import { CheckPullRequestCommentLanguageUseCase } from '../application/usecases/steps/pull_request_review_comment/check_pull_request_comment_language_use_case';
import { ThinkUseCase } from '../application/usecases/steps/common/think_use_case';
import { DefaultAgentRepositoryFactory } from '../data/repository/agent_repository_factory';
import { logDebugInfo, logError, logInfo } from '../utils/logger';

export async function dispatchMainRunRoute(
    route: MainRunRoute,
    execution: Execution,
    projectBoardCommandPort: ProjectBoardCommandPort,
    factory: RepositoryFactory,
): Promise<Result[]> {
    const results: Result[] = [];

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
                    const bugbot = createBugbotCompositionRoot();
                    results.push(...await new IssueCommentUseCase(
                        new CheckIssueCommentLanguageUseCase(
                            bugbot.issue,
                            new DefaultAgentRepositoryFactory().createFindings(),
                        ),
                        createDetectBugbotFixIntentUseCase(commentFactory),
                        new ThinkUseCase(commentFactory.createIssueContentRepository(), commentFactory.createIssueNotificationRepository(), new DefaultAgentRepositoryFactory().createFindings()),
                        new BugbotAutofixUseCase(new DefaultAgentRepositoryFactory().createFixer(), bugbot.context, new GitCommitAdapter()),
                        new DoUserRequestUseCase(new DefaultAgentRepositoryFactory().createFixer()),
                        bugbot.issue,
                        commentFactory.createActorAuthorizationRepository(),
                        createAuthenticatedUserCompositionRoot(),
                        {
                            issueComments: bugbot.issue,
                            pullRequestComments: bugbot.pullRequest,
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
                    const bugbot = createBugbotCompositionRoot();
                    results.push(...await new PullRequestReviewCommentUseCase(
                        new CheckPullRequestCommentLanguageUseCase(
                            bugbot.issue,
                            new DefaultAgentRepositoryFactory().createFindings(),
                        ),
                        createDetectBugbotFixIntentUseCase(reviewCommentFactory),
                        new ThinkUseCase(reviewCommentFactory.createIssueContentRepository(), reviewCommentFactory.createIssueNotificationRepository(), new DefaultAgentRepositoryFactory().createFindings()),
                        new BugbotAutofixUseCase(new DefaultAgentRepositoryFactory().createFixer(), bugbot.context, new GitCommitAdapter()),
                        new DoUserRequestUseCase(new DefaultAgentRepositoryFactory().createFixer()),
                        bugbot.issue,
                        reviewCommentFactory.createActorAuthorizationRepository(),
                        createAuthenticatedUserCompositionRoot(),
                        {
                            issueComments: bugbot.issue,
                            pullRequestComments: bugbot.pullRequest,
                        },
                        new GitCommitAdapter(),
                    ).invoke(execution));
                    break;
                }
                case 'pull-request':
                    logInfo(`Running PullRequestUseCase for PR #${execution.pullRequest.number}.`);
                    results.push(...await createPullRequestUseCaseCompositionRoot().invoke(execution));
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
                        createCheckProgressCompositionRoot(),
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
