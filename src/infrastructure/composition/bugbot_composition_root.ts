import type { BugbotContextPorts, BugbotWritePorts } from '../../application/ports/bugbot_ports';
import { BugbotIssueRepository } from '../../data/repository/issue/bugbot_issue_repository';
import { IssueContentRepository } from '../../data/repository/issue/issue_content_repository';
import { BugbotPullRequestRepository } from '../../data/repository/pull_request/bugbot_pull_request_repository';
import { PullRequestChangesRepository } from '../../data/repository/pull_request/pull_request_changes_repository';
import { PullRequestLifecycleRepository } from '../../data/repository/pull_request/pull_request_lifecycle_repository';
import { PullRequestReviewRepository } from '../../data/repository/pull_request/pull_request_review_repository';
import { GithubClientFactory } from './github_client_factory';

export type BugbotCompositionRoot = {
    issue: BugbotIssueRepository;
    pullRequest: BugbotPullRequestRepository;
    context: BugbotContextPorts;
    write: BugbotWritePorts;
};

export function createBugbotCompositionRoot(): BugbotCompositionRoot {
    const clients = new GithubClientFactory();
    const issue = new BugbotIssueRepository(new IssueContentRepository(clients.createIssueContentClient()));
    const pullRequest = new BugbotPullRequestRepository(
        new PullRequestLifecycleRepository(clients.createPullRequestLifecycleClient()),
        new PullRequestChangesRepository(clients.createPullRequestChangesClient()),
        new PullRequestReviewRepository(clients.createPullRequestReviewClient(), clients.createGraphqlClient()),
    );
    return {
        issue,
        pullRequest,
        context: { issue, pullRequest },
        write: { issueComments: issue, pullRequestComments: pullRequest },
    };
}
