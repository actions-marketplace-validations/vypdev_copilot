import { OctokitBranchClientAdapter, OctokitBranchMergeClientAdapter, OctokitBranchComparisonClientAdapter, OctokitGraphqlClientAdapter, OctokitIssueAssignmentClientAdapter, OctokitIssueContentClientAdapter, OctokitIssueLabelProvisioningClientAdapter, OctokitIssueLabelsClientAdapter, OctokitIssueLifecycleClientAdapter, OctokitIssueMetadataClientAdapter, OctokitIssueTitleClientAdapter, OctokitAuthenticatedUserClientAdapter, OctokitActorAuthorizationClientAdapter, OctokitOrganizationMembersClientAdapter, OctokitRepositoryContextClientAdapter, OctokitOwnerTypeClientAdapter, OctokitPullRequestChangesClientAdapter, OctokitReleaseClientAdapter, OctokitPullRequestLifecycleClientAdapter, OctokitPullRequestReviewClientAdapter, OctokitWorkflowClientAdapter } from "../github/octokit_client";

export class GithubClientFactory {
    createBranchClient(): OctokitBranchClientAdapter { return new OctokitBranchClientAdapter(); }
    createBranchMergeClient(): OctokitBranchMergeClientAdapter { return new OctokitBranchMergeClientAdapter(); }
    createBranchComparisonClient(): OctokitBranchComparisonClientAdapter { return new OctokitBranchComparisonClientAdapter(); }
    createGraphqlClient(): OctokitGraphqlClientAdapter { return new OctokitGraphqlClientAdapter(); }
    createIssueAssignmentClient(): OctokitIssueAssignmentClientAdapter { return new OctokitIssueAssignmentClientAdapter(); }
    createIssueContentClient(): OctokitIssueContentClientAdapter { return new OctokitIssueContentClientAdapter(); }
    createIssueLabelProvisioningClient(): OctokitIssueLabelProvisioningClientAdapter { return new OctokitIssueLabelProvisioningClientAdapter(); }
    createIssueLabelsClient(): OctokitIssueLabelsClientAdapter { return new OctokitIssueLabelsClientAdapter(); }
    createIssueLifecycleClient(): OctokitIssueLifecycleClientAdapter { return new OctokitIssueLifecycleClientAdapter(); }
    createIssueMetadataClient(): OctokitIssueMetadataClientAdapter { return new OctokitIssueMetadataClientAdapter(); }
    createIssueTitleClient(): OctokitIssueTitleClientAdapter { return new OctokitIssueTitleClientAdapter(); }
    createAuthenticatedUserClient(): OctokitAuthenticatedUserClientAdapter { return new OctokitAuthenticatedUserClientAdapter(); }
    createActorAuthorizationClient(): OctokitActorAuthorizationClientAdapter { return new OctokitActorAuthorizationClientAdapter(); }
    createOrganizationMembersClient(): OctokitOrganizationMembersClientAdapter { return new OctokitOrganizationMembersClientAdapter(); }
    createRepositoryContextClient(): OctokitRepositoryContextClientAdapter { return new OctokitRepositoryContextClientAdapter(); }
    createOwnerTypeClient(): OctokitOwnerTypeClientAdapter { return new OctokitOwnerTypeClientAdapter(); }
    createPullRequestChangesClient(): OctokitPullRequestChangesClientAdapter { return new OctokitPullRequestChangesClientAdapter(); }
    createReleaseClient(): OctokitReleaseClientAdapter { return new OctokitReleaseClientAdapter(); }
    createPullRequestLifecycleClient(): OctokitPullRequestLifecycleClientAdapter { return new OctokitPullRequestLifecycleClientAdapter(); }
    createPullRequestReviewClient(): OctokitPullRequestReviewClientAdapter { return new OctokitPullRequestReviewClientAdapter(); }
    createWorkflowClient(): OctokitWorkflowClientAdapter { return new OctokitWorkflowClientAdapter(); }
}
