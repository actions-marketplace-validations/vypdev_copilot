import { IssueLabelRepository } from '../../data/repository/issue/issue_label_repository';
import { GithubClientFactory } from './github_client_factory';

export function createIssueLabelRepository(): IssueLabelRepository {
    return new IssueLabelRepository(new GithubClientFactory().createIssueLabelsClient());
}
