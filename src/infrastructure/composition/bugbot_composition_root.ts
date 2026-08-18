import { createIssueContentClient } from './github_issue_client_factory';
import { createGraphqlTransportClient } from './github_project_client_factory';
import { createPullRequestChangesClient, createPullRequestLifecycleClient, createPullRequestReviewClient } from './github_pull_request_client_factory';
import type { BugbotContextPorts, BugbotWritePorts } from '../../application/ports/bugbot_ports';
import { BugbotIssueRepository } from '../../data/repository/issue/bugbot_issue_repository';
import { IssueContentRepository } from '../../data/repository/issue/issue_content_repository';
import { BugbotPullRequestRepository } from '../../data/repository/pull_request/bugbot_pull_request_repository';
import { PullRequestChangesRepository } from '../../data/repository/pull_request/pull_request_changes_repository';
import { PullRequestLifecycleRepository } from '../../data/repository/pull_request/pull_request_lifecycle_repository';
import { PullRequestReviewRepository } from '../../data/repository/pull_request/pull_request_review_repository';

export type BugbotCompositionRoot = {
    issue: BugbotIssueRepository;
    pullRequest: BugbotPullRequestRepository;
    context: BugbotContextPorts;
    write: BugbotWritePorts;
};

export function createBugbotCompositionRoot(): BugbotCompositionRoot {
    const issue = new BugbotIssueRepository(new IssueContentRepository(createIssueContentClient()));
    const pullRequest = new BugbotPullRequestRepository(
        new PullRequestLifecycleRepository(createPullRequestLifecycleClient()),
        new PullRequestChangesRepository(createPullRequestChangesClient()),
        new PullRequestReviewRepository(createPullRequestReviewClient(), createGraphqlTransportClient()),
    );
    return {
        issue,
        pullRequest,
        context: { issue, pullRequest },
        write: { issueComments: issue, pullRequestComments: pullRequest },
    };
}
