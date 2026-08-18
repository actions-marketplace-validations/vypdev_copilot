import { createBranchComparisonClient } from '../infrastructure/composition/github_branch_client_factory';
import { createPullRequestLifecycleClient } from '../infrastructure/composition/github_pull_request_client_factory';
import { createCheckProgressCompositionRoot } from '../infrastructure/composition/check_progress_composition_root';
import { createBugbotCompositionRoot } from '../infrastructure/composition/bugbot_composition_root';
import { createPullRequestUseCaseCompositionRoot } from '../infrastructure/composition/pull_request_use_case_composition_root';
import { createIssueUseCaseCompositionRoot } from '../infrastructure/composition/issue_use_case_composition_root';
import { createIssueContentCompositionRoot } from '../infrastructure/composition/issue_content_composition_root';
import { createIssueNotificationRepository } from '../infrastructure/composition/issue_interaction_composition_root';
import { createActorAuthorizationRepository } from '../infrastructure/composition/actor_authorization_composition_root';
import { createIssueLabelRepository } from '../infrastructure/composition/issue_labels_composition_root';
import { PullRequestLifecycleRepository } from '../data/repository/pull_request/pull_request_lifecycle_repository';
import { BranchCompareRepository } from '../data/repository/branch_compare_repository';
import * as core from '@actions/core';
import { Execution } from '../data/model/execution';
import { Result } from '../data/model/result';
import { CommitUseCase } from '../application/usecases/commit_use_case';
import { NotifyNewCommitOnIssueUseCase } from '../application/usecases/steps/commit/notify_new_commit_on_issue_use_case';
import { CheckChangesIssueSizeUseCase } from '../application/usecases/steps/commit/check_changes_issue_size_use_case';
import { BugbotAutofixUseCase } from '../application/usecases/steps/commit/bugbot/bugbot_autofix_use_case';
import { DoUserRequestUseCase } from '../application/usecases/steps/commit/user_request_use_case';
import { ProjectBoardCommandPort } from '../application/ports/project_board_ports';
import { createAuthenticatedUserCompositionRoot } from '../infrastructure/composition/authenticated_user_composition_root';
import { GitCommitAdapter } from '../infrastructure/git_commit_adapter';
import type { MainRunRoute } from './main_run_route';
import { createDetectPotentialProblemsUseCase, createDetectBugbotFixIntentUseCase, createSingleActionUseCase } from './main_run_composition';
import { IssueCommentUseCase } from '../application/usecases/issue_comment_use_case';
import { CheckIssueCommentLanguageUseCase } from '../application/usecases/steps/issue_comment/check_issue_comment_language_use_case';
import { PullRequestReviewCommentUseCase } from '../application/usecases/pull_request_review_comment_use_case';
import { CheckPullRequestCommentLanguageUseCase } from '../application/usecases/steps/pull_request_review_comment/check_pull_request_comment_language_use_case';
import { ThinkUseCase } from '../application/usecases/steps/common/think_use_case';
import { createFindingsQueryPort, createFixerQueryPort } from '../infrastructure/composition/agent_capability_composition_root';
import { logDebugInfo, logError, logInfo } from '../utils/logger';

export async function dispatchMainRunRoute(
    route: MainRunRoute,
    execution: Execution,
    projectBoardCommandPort: ProjectBoardCommandPort,
): Promise<Result[]> {
    const results: Result[] = [];

            switch (route) {
                case 'single-action': {
                    logInfo(`Running SingleActionUseCase (action: ${execution.singleAction.currentSingleAction}).`);
                    results.push(...await createSingleActionUseCase().invoke(execution));
                    break;
                }
                case 'issue-comment': {
                    logInfo(`Running IssueCommentUseCase for issue #${execution.issue.number}.`);
                    const bugbot = createBugbotCompositionRoot();
                    results.push(...await new IssueCommentUseCase(
                        new CheckIssueCommentLanguageUseCase(
                            bugbot.issue,
                            createFindingsQueryPort(),
                        ),
                        createDetectBugbotFixIntentUseCase(),
                        new ThinkUseCase(createIssueContentCompositionRoot(), createIssueNotificationRepository(), createFindingsQueryPort()),
                        new BugbotAutofixUseCase(createFixerQueryPort(), bugbot.context, new GitCommitAdapter()),
                        new DoUserRequestUseCase(createFixerQueryPort()),
                        bugbot.issue,
                        createActorAuthorizationRepository(),
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
                    results.push(...await createIssueUseCaseCompositionRoot().invoke(execution));
                    break;
                case 'pull-request-review-comment': {
                    logInfo(`Running PullRequestReviewCommentUseCase for PR #${execution.pullRequest.number}.`);
                    const bugbot = createBugbotCompositionRoot();
                    results.push(...await new PullRequestReviewCommentUseCase(
                        new CheckPullRequestCommentLanguageUseCase(
                            bugbot.issue,
                            createFindingsQueryPort(),
                        ),
                        createDetectBugbotFixIntentUseCase(),
                        new ThinkUseCase(createIssueContentCompositionRoot(), createIssueNotificationRepository(), createFindingsQueryPort()),
                        new BugbotAutofixUseCase(createFixerQueryPort(), bugbot.context, new GitCommitAdapter()),
                        new DoUserRequestUseCase(createFixerQueryPort()),
                        bugbot.issue,
                        createActorAuthorizationRepository(),
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
                    results.push(...await new CommitUseCase(
                        new NotifyNewCommitOnIssueUseCase(createIssueNotificationRepository()),
                        new CheckChangesIssueSizeUseCase(
                            projectBoardCommandPort,
                            createIssueLabelRepository(),
                            new PullRequestLifecycleRepository(createPullRequestLifecycleClient()),
                            new BranchCompareRepository(createBranchComparisonClient()),
                        ),
                        createDetectPotentialProblemsUseCase(),
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
