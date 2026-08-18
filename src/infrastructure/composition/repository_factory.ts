
import { ActorAuthorizationRepository } from "../../data/repository/organization/actor_authorization_repository";

import { IssueAssignmentRepository } from "../../data/repository/issue/issue_assignment_repository";
import { IssueContentRepository } from "../../data/repository/issue/issue_content_repository";
import { IssueLabelRepository } from "../../data/repository/issue/issue_label_repository";
import { IssueLifecycleRepository } from "../../data/repository/issue/issue_lifecycle_repository";
import { IssueTypeAssignmentRepository } from "../../data/repository/issue/issue_type_assignment_repository";
import { IssueMetadataRepository } from "../../data/repository/issue/issue_metadata_repository";
import { IssueTitleRepository } from "../../data/repository/issue/issue_title_repository";
import { IssueClosureRepository } from "../../data/repository/issue/issue_closure_repository";
import { IssueNotificationRepository } from "../../data/repository/issue/issue_notification_repository";

import { MergeRepository } from "../../data/repository/merge_repository";
import { BranchCompareRepository } from "../../data/repository/branch_compare_repository";
import { GitCliRepository } from "../../data/repository/git_cli_repository";
import { BranchLifecycleRepository } from "../../data/repository/branch_lifecycle_repository";
import { BranchNameRepository } from "../../data/repository/branch_name_repository";
import { BranchPreparationRepository } from "../../data/repository/branch/branch_preparation_repository";
import { LinkedBranchRepository } from "../../data/repository/branch/linked_branch_repository";
import { WorkflowRepository } from "../../data/repository/workflow_repository";
import { GithubClientFactory } from "./github_client_factory";

export class RepositoryFactory {
    private readonly githubClients = new GithubClientFactory();
    createOrganizationGithubClient(): ReturnType<GithubClientFactory['createOrganizationClient']> {
        return this.githubClients.createOrganizationClient();
    }
    createGraphqlClient(): ReturnType<GithubClientFactory['createGraphqlClient']> {
        return this.githubClients.createGraphqlClient();
    }
    createGitCliRepository(): GitCliRepository { return new GitCliRepository(); }
    createBranchLifecycleRepository(): BranchLifecycleRepository {
        return new BranchLifecycleRepository(this.githubClients.createBranchClient());
    }
    createBranchNameRepository(): BranchNameRepository {
        return new BranchNameRepository();
    }
    createBranchPreparationRepository(): BranchPreparationRepository {
        return new BranchPreparationRepository(
            this.githubClients.createBranchClient(),
            this.createBranchNameRepository(),
            new LinkedBranchRepository(this.createGraphqlClient()),
            new GitCliRepository(),
        );
    }
    createWorkflowRepository(): WorkflowRepository {
        return new WorkflowRepository(this.githubClients.createWorkflowClient());
    }
    createActorAuthorizationRepository(): ActorAuthorizationRepository {
        return new ActorAuthorizationRepository(this.createOrganizationGithubClient());
    }


    createIssueAssignmentRepository(): IssueAssignmentRepository { return new IssueAssignmentRepository(this.githubClients.createIssueAssignmentClient()); }
    createIssueLabelRepository(): IssueLabelRepository { return new IssueLabelRepository(this.githubClients.createIssueLabelsClient()); }
    createIssueTitleRepository(metadataRepository?: ConstructorParameters<typeof IssueTitleRepository>[1]): IssueTitleRepository {
        const metadata = metadataRepository ?? new IssueMetadataRepository(this.githubClients.createIssueMetadataClient(), this.githubClients.createGraphqlClient());
        return new IssueTitleRepository(this.githubClients.createIssueTitleClient(), metadata);
    }
    createIssueClosureRepository(): IssueClosureRepository {
        return new IssueClosureRepository(new IssueLifecycleRepository(this.githubClients.createIssueLifecycleClient()), new IssueContentRepository(this.githubClients.createIssueContentClient()));
    }
    createIssueNotificationRepository(): IssueNotificationRepository {
        return new IssueNotificationRepository(new IssueLifecycleRepository(this.githubClients.createIssueLifecycleClient()), new IssueContentRepository(this.githubClients.createIssueContentClient()));
    }
    createIssueTypeAssignmentRepository(
        getIssueId: ConstructorParameters<typeof IssueTypeAssignmentRepository>[0],
    ): IssueTypeAssignmentRepository {
        return new IssueTypeAssignmentRepository(getIssueId, this.githubClients.createGraphqlClient());
    }



    createMergeRepository(): MergeRepository {
        return new MergeRepository(this.githubClients.createBranchMergeClient());
    }
    createBranchCompareRepository(): BranchCompareRepository {
        return new BranchCompareRepository(this.githubClients.createBranchComparisonClient());
    }
}
