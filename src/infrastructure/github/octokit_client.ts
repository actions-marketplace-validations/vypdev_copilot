import * as github from "@actions/github";
import type { GithubBranchClient, GithubBranchComparisonClient, GithubBranchMergeClient, GithubClientPort, GithubGraphqlClient, GithubIssueAssignmentClient, GithubIssueContentClient, GithubIssueLabelProvisioningClient, GithubIssueLabelsClient, GithubIssueLifecycleClient, GithubIssueMetadataClient, GithubIssueTitleClient, GithubOrganizationClient, GithubPullRequestChangesClient, GithubPullRequestLifecycleClient, GithubPullRequestReviewClient, GithubWorkflowClient } from "../../data/repository/github/github_client_port";

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
export class OctokitBranchMergeClientAdapter implements GithubClientPort<GithubBranchMergeClient> {
    getClient(token: string): GithubBranchMergeClient { return github.getOctokit(token) as unknown as GithubBranchMergeClient; }
}
export class OctokitBranchClientAdapter implements GithubClientPort<GithubBranchClient> {
    getClient(token: string): GithubBranchClient { return github.getOctokit(token) as unknown as GithubBranchClient; }
}
export class OctokitBranchComparisonClientAdapter implements GithubClientPort<GithubBranchComparisonClient> {
    getClient(token: string): GithubBranchComparisonClient { return github.getOctokit(token) as unknown as GithubBranchComparisonClient; }
}
export class OctokitIssueTitleClientAdapter implements GithubClientPort<GithubIssueTitleClient> {
    getClient(token: string): GithubIssueTitleClient { return github.getOctokit(token) as unknown as GithubIssueTitleClient; }
}
export class OctokitIssueMetadataClientAdapter implements GithubClientPort<GithubIssueMetadataClient> {
    getClient(token: string): GithubIssueMetadataClient { return github.getOctokit(token) as unknown as GithubIssueMetadataClient; }
}
export class OctokitIssueLabelsClientAdapter implements GithubClientPort<GithubIssueLabelsClient> {
    getClient(token: string): GithubIssueLabelsClient { return github.getOctokit(token) as unknown as GithubIssueLabelsClient; }
}
export class OctokitIssueLabelProvisioningClientAdapter implements GithubClientPort<GithubIssueLabelProvisioningClient> {
    getClient(token: string): GithubIssueLabelProvisioningClient { return github.getOctokit(token) as unknown as GithubIssueLabelProvisioningClient; }
}
export class OctokitIssueAssignmentClientAdapter implements GithubClientPort<GithubIssueAssignmentClient> {
    getClient(token: string): GithubIssueAssignmentClient { return github.getOctokit(token) as unknown as GithubIssueAssignmentClient; }
}
