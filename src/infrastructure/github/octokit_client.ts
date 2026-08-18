import { getOctokitClient } from "./octokit_client_factory";
import type { GithubAuthenticatedUserClient, GithubActorAuthorizationClient, GithubOrganizationMembersClient, GithubBranchClient, GithubBranchComparisonClient, GithubBranchMergeClient, GithubClientPort, GithubGraphqlClient, GithubProjectClient, GithubReleaseClient, GithubIssueAssignmentClient, GithubIssueContentClient, GithubIssueLabelProvisioningClient, GithubIssueLabelsClient, GithubIssueLifecycleClient, GithubIssueMetadataClient, GithubIssueTitleClient, GithubPullRequestChangesClient, GithubPullRequestLifecycleClient, GithubPullRequestReviewClient, GithubWorkflowClient } from "../../application/ports/github_provider_ports";


export class OctokitWorkflowClientAdapter implements GithubClientPort<GithubWorkflowClient> {
    getClient(token: string): GithubWorkflowClient { return getOctokitClient<GithubWorkflowClient>(token); }
}
export class OctokitAuthenticatedUserClientAdapter implements GithubClientPort<GithubAuthenticatedUserClient> {
    getClient(token: string): GithubAuthenticatedUserClient { return getOctokitClient<GithubAuthenticatedUserClient>(token); }
}
export class OctokitActorAuthorizationClientAdapter implements GithubClientPort<GithubActorAuthorizationClient> {
    getClient(token: string): GithubActorAuthorizationClient { return getOctokitClient<GithubActorAuthorizationClient>(token); }
}
export class OctokitOrganizationMembersClientAdapter implements GithubClientPort<GithubOrganizationMembersClient> {
    getClient(token: string): GithubOrganizationMembersClient { return getOctokitClient<GithubOrganizationMembersClient>(token); }
}
export class OctokitPullRequestChangesClientAdapter implements GithubClientPort<GithubPullRequestChangesClient> {
    getClient(token: string): GithubPullRequestChangesClient { return getOctokitClient<GithubPullRequestChangesClient>(token); }
}
export class OctokitGraphqlClientAdapter implements GithubClientPort<GithubGraphqlClient> {
    getClient(token: string): GithubGraphqlClient { return getOctokitClient<GithubGraphqlClient>(token); }
}
export class OctokitPullRequestReviewClientAdapter implements GithubClientPort<GithubPullRequestReviewClient> {
    getClient(token: string): GithubPullRequestReviewClient { return getOctokitClient<GithubPullRequestReviewClient>(token); }
}
export class OctokitPullRequestLifecycleClientAdapter implements GithubClientPort<GithubPullRequestLifecycleClient> {
    getClient(token: string): GithubPullRequestLifecycleClient { return getOctokitClient<GithubPullRequestLifecycleClient>(token); }
}
export class OctokitIssueLifecycleClientAdapter implements GithubClientPort<GithubIssueLifecycleClient> {
    getClient(token: string): GithubIssueLifecycleClient { return getOctokitClient<GithubIssueLifecycleClient>(token); }
}
export class OctokitReleaseClientAdapter implements GithubClientPort<GithubReleaseClient> {
    getClient(token: string): GithubReleaseClient { return getOctokitClient<GithubReleaseClient>(token); }
}
export class OctokitProjectClientAdapter implements GithubClientPort<GithubProjectClient> {
    getClient(token: string): GithubProjectClient { return getOctokitClient<GithubProjectClient>(token); }
}
export class OctokitIssueContentClientAdapter implements GithubClientPort<GithubIssueContentClient> {
    getClient(token: string): GithubIssueContentClient { return getOctokitClient<GithubIssueContentClient>(token); }
}
export class OctokitBranchMergeClientAdapter implements GithubClientPort<GithubBranchMergeClient> {
    getClient(token: string): GithubBranchMergeClient { return getOctokitClient<GithubBranchMergeClient>(token); }
}
export class OctokitBranchClientAdapter implements GithubClientPort<GithubBranchClient> {
    getClient(token: string): GithubBranchClient { return getOctokitClient<GithubBranchClient>(token); }
}
export class OctokitBranchComparisonClientAdapter implements GithubClientPort<GithubBranchComparisonClient> {
    getClient(token: string): GithubBranchComparisonClient { return getOctokitClient<GithubBranchComparisonClient>(token); }
}
export class OctokitIssueTitleClientAdapter implements GithubClientPort<GithubIssueTitleClient> {
    getClient(token: string): GithubIssueTitleClient { return getOctokitClient<GithubIssueTitleClient>(token); }
}
export class OctokitIssueMetadataClientAdapter implements GithubClientPort<GithubIssueMetadataClient> {
    getClient(token: string): GithubIssueMetadataClient { return getOctokitClient<GithubIssueMetadataClient>(token); }
}
export class OctokitIssueLabelsClientAdapter implements GithubClientPort<GithubIssueLabelsClient> {
    getClient(token: string): GithubIssueLabelsClient { return getOctokitClient<GithubIssueLabelsClient>(token); }
}
export class OctokitIssueLabelProvisioningClientAdapter implements GithubClientPort<GithubIssueLabelProvisioningClient> {
    getClient(token: string): GithubIssueLabelProvisioningClient { return getOctokitClient<GithubIssueLabelProvisioningClient>(token); }
}
export class OctokitIssueAssignmentClientAdapter implements GithubClientPort<GithubIssueAssignmentClient> {
    getClient(token: string): GithubIssueAssignmentClient { return getOctokitClient<GithubIssueAssignmentClient>(token); }
}
