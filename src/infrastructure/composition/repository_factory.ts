
import { ActorAuthorizationRepository } from "../../data/repository/organization/actor_authorization_repository";

import { IssueAssignmentRepository } from "../../data/repository/issue/issue_assignment_repository";
import { IssueContentRepository } from "../../data/repository/issue/issue_content_repository";
import { IssueLabelRepository } from "../../data/repository/issue/issue_label_repository";
import { IssueLifecycleRepository } from "../../data/repository/issue/issue_lifecycle_repository";
import { IssueMetadataRepository } from "../../data/repository/issue/issue_metadata_repository";
import { IssueTypeAssignmentRepository } from "../../data/repository/issue/issue_type_assignment_repository";
import { IssueTitleRepository } from "../../data/repository/issue/issue_title_repository";
import { IssueClosureRepository } from "../../data/repository/issue/issue_closure_repository";
import { IssueNotificationRepository } from "../../data/repository/issue/issue_notification_repository";
import { PullRequestChangesRepository } from "../../data/repository/pull_request/pull_request_changes_repository";
import { PullRequestLifecycleRepository } from "../../data/repository/pull_request/pull_request_lifecycle_repository";

import { PullRequestReviewRepository } from "../../data/repository/pull_request/pull_request_review_repository";
import { MergeRepository } from "../../data/repository/merge_repository";
import { BranchCompareRepository } from "../../data/repository/branch_compare_repository";
import { GitCliRepository } from "../../data/repository/git_cli_repository";
import { BranchLifecycleRepository } from "../../data/repository/branch_lifecycle_repository";
import { BranchNameRepository } from "../../data/repository/branch_name_repository";
import { BranchPreparationRepository } from "../../data/repository/branch/branch_preparation_repository";
import { LinkedBranchRepository } from "../../data/repository/branch/linked_branch_repository";
import { RecommendStepsUseCase } from "../../application/usecases/actions/recommend_steps_use_case";
import { AnswerIssueHelpUseCase } from "../../application/usecases/steps/issue/answer_issue_help_use_case";
import { DefaultAgentRepositoryFactory } from "../../data/repository/agent_repository_factory";
import { WorkflowRepository } from "../../data/repository/workflow_repository";
import { GithubClientFactory } from "./github_client_factory";
import { composeIssueUseCase } from "./issue_use_case_composition";
import { createProjectBoardCompositionRoot } from "./project_board_composition_root";
import { createOrganizationMembersCompositionRoot } from "./organization_members_composition_root";

export class RepositoryFactory {
    private readonly githubClients = new GithubClientFactory();
    createOrganizationGithubClient(): ReturnType<GithubClientFactory['createOrganizationClient']> {
        return this.githubClients.createOrganizationClient();
    }
    createPullRequestChangesClient(): ReturnType<GithubClientFactory['createPullRequestChangesClient']> {
        return this.githubClients.createPullRequestChangesClient();
    }
    createGraphqlClient(): ReturnType<GithubClientFactory['createGraphqlClient']> {
        return this.githubClients.createGraphqlClient();
    }
    createPullRequestReviewClient(): ReturnType<GithubClientFactory['createPullRequestReviewClient']> {
        return this.githubClients.createPullRequestReviewClient();
    }
    createPullRequestLifecycleClient(): ReturnType<GithubClientFactory['createPullRequestLifecycleClient']> {
        return this.githubClients.createPullRequestLifecycleClient();
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
    createIssueUseCase(): ReturnType<typeof composeIssueUseCase> {
        const issueMetadataRepository = this.createIssueMetadataRepository();
        return composeIssueUseCase(
            createProjectBoardCompositionRoot(),
            createOrganizationMembersCompositionRoot(),
            issueMetadataRepository,
            createProjectBoardCompositionRoot(),
            this.createIssueTitleRepository(issueMetadataRepository),
            this.createIssueAssignmentRepository(),
            this.createIssueClosureRepository(),
            this.createIssueTypeAssignmentRepository(
                (owner, repository, issueNumber, token) => issueMetadataRepository.getId(owner, repository, issueNumber, token),
            ),
            this.createIssueContentRepository(),
            this.createIssueNotificationRepository(),
            this.createBranchLifecycleRepository(),
            this.createBranchNameRepository(),
            this.createBranchPreparationRepository(),
            this.createWorkflowRepository(),
            new RecommendStepsUseCase(this.createIssueContentRepository(), new DefaultAgentRepositoryFactory().createFindings()),
            new AnswerIssueHelpUseCase(this.createIssueNotificationRepository(), new DefaultAgentRepositoryFactory().createFindings()),
        );
    }
    createActorAuthorizationRepository(): ActorAuthorizationRepository {
        return new ActorAuthorizationRepository(this.createOrganizationGithubClient());
    }


    createIssueAssignmentRepository(): IssueAssignmentRepository { return new IssueAssignmentRepository(this.githubClients.createIssueAssignmentClient()); }
    createIssueContentRepository(): IssueContentRepository { return new IssueContentRepository(this.githubClients.createIssueContentClient()); }
    createIssueLabelRepository(): IssueLabelRepository { return new IssueLabelRepository(this.githubClients.createIssueLabelsClient()); }
    createIssueMetadataRepository(): IssueMetadataRepository { return new IssueMetadataRepository(this.githubClients.createIssueMetadataClient(), this.githubClients.createGraphqlClient()); }
    createIssueTitleRepository(metadataRepository = this.createIssueMetadataRepository()): IssueTitleRepository {
        return new IssueTitleRepository(this.githubClients.createIssueTitleClient(), metadataRepository);
    }
    createIssueClosureRepository(): IssueClosureRepository {
        return new IssueClosureRepository(this.createIssueLifecycleRepository(), this.createIssueContentRepository());
    }
    createIssueNotificationRepository(): IssueNotificationRepository {
        return new IssueNotificationRepository(this.createIssueLifecycleRepository(), this.createIssueContentRepository());
    }
    createIssueLifecycleRepository(): IssueLifecycleRepository { return new IssueLifecycleRepository(this.githubClients.createIssueLifecycleClient()); }
    createIssueTypeAssignmentRepository(
        getIssueId: ConstructorParameters<typeof IssueTypeAssignmentRepository>[0],
    ): IssueTypeAssignmentRepository {
        return new IssueTypeAssignmentRepository(getIssueId, this.githubClients.createGraphqlClient());
    }


    createPullRequestChangesRepository(): PullRequestChangesRepository {
        return new PullRequestChangesRepository(this.createPullRequestChangesClient());
    }

    createPullRequestLifecycleRepository(): PullRequestLifecycleRepository {
        return new PullRequestLifecycleRepository(this.createPullRequestLifecycleClient());
    }

    createPullRequestReviewRepository(): PullRequestReviewRepository {
        return new PullRequestReviewRepository(this.createPullRequestReviewClient(), this.createGraphqlClient());
    }


    createMergeRepository(): MergeRepository {
        return new MergeRepository(this.githubClients.createBranchMergeClient());
    }
    createBranchCompareRepository(): BranchCompareRepository {
        return new BranchCompareRepository(this.githubClients.createBranchComparisonClient());
    }
}
