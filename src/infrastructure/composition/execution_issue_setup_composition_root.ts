import { ExecutionIssueSetupRepository } from "../../data/repository/issue/execution_issue_setup_repository";
import { IssueContentRepository } from "../../data/repository/issue/issue_content_repository";
import { IssueLabelRepository } from "../../data/repository/issue/issue_label_repository";
import { IssueMetadataRepository } from "../../data/repository/issue/issue_metadata_repository";
import { GithubClientFactory } from "./github_client_factory";

export function createExecutionIssueSetupCompositionRoot(): ExecutionIssueSetupRepository {
    const clients = new GithubClientFactory();
    return new ExecutionIssueSetupRepository(
        new IssueMetadataRepository(clients.createIssueMetadataClient(), clients.createGraphqlTransportClient()),
        new IssueContentRepository(clients.createIssueContentClient()),
        new IssueLabelRepository(clients.createIssueLabelsClient()),
    );
}
