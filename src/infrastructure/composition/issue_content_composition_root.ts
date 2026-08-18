import { IssueContentRepository } from '../../data/repository/issue/issue_content_repository';
import { GithubClientFactory } from './github_client_factory';

export function createIssueContentCompositionRoot(): IssueContentRepository {
    const clients = new GithubClientFactory();
    return new IssueContentRepository(clients.createIssueContentClient());
}
