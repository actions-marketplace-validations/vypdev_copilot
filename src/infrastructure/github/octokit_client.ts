import * as github from "@actions/github";
import type { GithubClientPort, GithubGraphqlClient, GithubIssueContentClient, GithubIssueLifecycleClient, GithubIssueMetadataClient, GithubOrganizationClient, GithubPullRequestChangesClient, GithubPullRequestLifecycleClient, GithubPullRequestReviewClient, GithubWorkflowClient } from "../../data/repository/github/github_client_port";

export type OctokitClient = ReturnType<typeof github.getOctokit>;

export class OctokitClientAdapter implements GithubClientPort<OctokitClient> {
    getClient(token: string): OctokitClient { return github.getOctokit(token); }
}
export class OctokitWorkflowClientAdapter implements GithubClientPort<GithubWorkflowClient> {
    getClient(token: string): GithubWorkflowClient { return github.getOctokit(token) as unknown as GithubWorkflowClient; }
}
export class OctokitOrganizationClientAdapter implements GithubClientPort<GithubOrganizationClient> {
    getClient(token: string): GithubOrganizationClient { return github.getOctokit(token) as unknown as GithubOrganizationClient; }
}
export class OctokitPullRequestChangesClientAdapter implements GithubClientPort<GithubPullRequestChangesClient> {
    getClient(token: string): GithubPullRequestChangesClient { return github.getOctokit(token) as unknown as GithubPullRequestChangesClient; }
}
export class OctokitGraphqlClientAdapter implements GithubClientPort<GithubGraphqlClient> {
    getClient(token: string): GithubGraphqlClient { return github.getOctokit(token) as unknown as GithubGraphqlClient; }
}
export class OctokitPullRequestReviewClientAdapter implements GithubClientPort<GithubPullRequestReviewClient> {
    getClient(token: string): GithubPullRequestReviewClient { return github.getOctokit(token) as unknown as GithubPullRequestReviewClient; }
}
export class OctokitPullRequestLifecycleClientAdapter implements GithubClientPort<GithubPullRequestLifecycleClient> {
    getClient(token: string): GithubPullRequestLifecycleClient { return github.getOctokit(token) as unknown as GithubPullRequestLifecycleClient; }
}
export class OctokitIssueLifecycleClientAdapter implements GithubClientPort<GithubIssueLifecycleClient> {
    getClient(token: string): GithubIssueLifecycleClient { return github.getOctokit(token) as unknown as GithubIssueLifecycleClient; }
}
export class OctokitIssueContentClientAdapter implements GithubClientPort<GithubIssueContentClient> {
    getClient(token: string): GithubIssueContentClient { return github.getOctokit(token) as unknown as GithubIssueContentClient; }
}
export class OctokitIssueMetadataClientAdapter implements GithubClientPort<GithubIssueMetadataClient> {
    getClient(token: string): GithubIssueMetadataClient { return github.getOctokit(token) as unknown as GithubIssueMetadataClient; }
}
