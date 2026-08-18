import { IssueContentRepository } from '../../data/repository/issue/issue_content_repository';
import { IssueLifecycleRepository } from '../../data/repository/issue/issue_lifecycle_repository';
import { IssueClosureRepository } from '../../data/repository/issue/issue_closure_repository';
import { IssueNotificationRepository } from '../../data/repository/issue/issue_notification_repository';
import { GithubClientFactory } from './github_client_factory';

export function createIssueClosureRepository(): IssueClosureRepository {
    const clients = new GithubClientFactory();
    return new IssueClosureRepository(
        new IssueLifecycleRepository(clients.createIssueLifecycleClient()),
        new IssueContentRepository(clients.createIssueContentClient()),
    );
}

export function createIssueNotificationRepository(): IssueNotificationRepository {
    const clients = new GithubClientFactory();
    return new IssueNotificationRepository(
        new IssueLifecycleRepository(clients.createIssueLifecycleClient()),
        new IssueContentRepository(clients.createIssueContentClient()),
    );
}
