import { IssueMetadataRepository } from '../../data/repository/issue/issue_metadata_repository';
import { GithubClientFactory } from './github_client_factory';

export function createIssueMetadataCompositionRoot(): IssueMetadataRepository {
    const clients = new GithubClientFactory();
    return new IssueMetadataRepository(clients.createIssueMetadataClient(), clients.createGraphqlTransportClient());
}
