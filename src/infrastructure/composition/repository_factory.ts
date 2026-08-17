import { OrganizationRepository } from "../../data/repository/organization/organization_repository";
import { IssueRepository } from "../../data/repository/issue_repository";
import { IssueAssignmentRepository } from "../../data/repository/issue/issue_assignment_repository";
import { IssueContentRepository } from "../../data/repository/issue/issue_content_repository";
import { IssueLabelRepository } from "../../data/repository/issue/issue_label_repository";
import { IssueLabelProvisioningRepository } from "../../data/repository/issue/issue_label_provisioning_repository";
import { IssueLifecycleRepository } from "../../data/repository/issue/issue_lifecycle_repository";
import { IssueMetadataRepository } from "../../data/repository/issue/issue_metadata_repository";
import { IssueProgressLabelRepository } from "../../data/repository/issue/issue_progress_label_repository";
import { IssueTypeRepository } from "../../data/repository/issue/issue_type_repository";
import { IssueTypeAssignmentRepository } from "../../data/repository/issue/issue_type_assignment_repository";
import { ProjectBoardRepository } from "../../data/repository/project/project_board_repository";
import { PullRequestChangesRepository } from "../../data/repository/pull_request/pull_request_changes_repository";
import { PullRequestLifecycleRepository } from "../../data/repository/pull_request/pull_request_lifecycle_repository";
import { PullRequestReviewRepository } from "../../data/repository/pull_request/pull_request_review_repository";
import { PullRequestReviewThreadRepository } from "../../data/repository/pull_request/pull_request_review_thread_repository";
import { PullRequestRepository } from "../../data/repository/pull_request_repository";
import { RepositoryReleaseRepository } from "../../data/repository/release/repository_release_repository";
import { OctokitBranchClientAdapter, OctokitBranchMergeClientAdapter, OctokitBranchComparisonClientAdapter, OctokitGraphqlClientAdapter, OctokitIssueAssignmentClientAdapter, OctokitIssueContentClientAdapter, OctokitIssueLabelProvisioningClientAdapter, OctokitIssueLabelsClientAdapter, OctokitIssueLifecycleClientAdapter, OctokitIssueMetadataClientAdapter, OctokitIssueTitleClientAdapter, OctokitOrganizationClientAdapter, OctokitProjectClientAdapter, OctokitPullRequestChangesClientAdapter, OctokitReleaseClientAdapter, OctokitPullRequestLifecycleClientAdapter, OctokitPullRequestReviewClientAdapter, OctokitWorkflowClientAdapter } from "../github/octokit_client";
import { IssueUseCase } from "../../application/usecases/issue_use_case";
import { PullRequestUseCase } from "../../application/usecases/pull_request_use_case";
import { InitialSetupUseCase } from "../../application/usecases/actions/initial_setup_use_case";
import { MergeRepository } from "../../data/repository/merge_repository";
import { BranchCompareRepository } from "../../data/repository/branch_compare_repository";
import { BranchRepository } from "../../data/repository/branch_repository";
import { CheckProgressUseCase } from "../../application/usecases/actions/check_progress_use_case";
import { DefaultAgentRepositoryFactory } from "../../data/repository/agent_repository_factory";
import { WorkflowRepository } from "../../data/repository/workflow_repository";

export class RepositoryFactory {
    createOrganizationGithubClient(): OctokitOrganizationClientAdapter {
        return new OctokitOrganizationClientAdapter();
    }
    createPullRequestChangesClient(): OctokitPullRequestChangesClientAdapter {
        return new OctokitPullRequestChangesClientAdapter();
    }
    createGraphqlClient(): OctokitGraphqlClientAdapter {
        return new OctokitGraphqlClientAdapter();
    }
    createPullRequestReviewClient(): OctokitPullRequestReviewClientAdapter {
        return new OctokitPullRequestReviewClientAdapter();
    }
    createPullRequestLifecycleClient(): OctokitPullRequestLifecycleClientAdapter {
        return new OctokitPullRequestLifecycleClientAdapter();
    }
    createBranchRepository(): BranchRepository {
        return new BranchRepository(this.createWorkflowRepository(), new OctokitBranchClientAdapter(), new OctokitGraphqlClientAdapter(), new BranchCompareRepository(new OctokitBranchComparisonClientAdapter()), new MergeRepository(new OctokitBranchMergeClientAdapter()));
    }
    createWorkflowRepository(): WorkflowRepository {
        return new WorkflowRepository(new OctokitWorkflowClientAdapter());
    }
    createCheckProgressUseCase(): CheckProgressUseCase {
        const issueRepository = this.createIssueRepository();
        return new CheckProgressUseCase(
            issueRepository,
            this.createBranchRepository(),
            this.createPullRequestRepository(),
            new DefaultAgentRepositoryFactory().createFindings(),
        );
    }

    createIssueUseCase(): IssueUseCase {
        return new IssueUseCase(
            this.createProjectBoardRepository(),
            this.createOrganizationRepository(),
            this.createIssueRepository(),
            this.createProjectBoardRepository(),
            this.createIssueRepository(),
            this.createIssueRepository(),
            this.createIssueRepository(),
            this.createIssueRepository(),
            this.createIssueRepository(),
            this.createIssueRepository(),
            this.createBranchRepository(),
            this.createBranchRepository(),
            this.createBranchRepository(),
            this.createBranchRepository(),
        );
    }
    createPullRequestUseCase(): PullRequestUseCase {
        return new PullRequestUseCase(
            this.createProjectBoardRepository(),
            this.createPullRequestRepository(),
            this.createIssueRepository(),
            this.createIssueRepository(),
            this.createIssueRepository(),
            this.createIssueRepository(),
            this.createPullRequestRepository(),
            this.createOrganizationRepository(),
            this.createIssueRepository(),
            this.createPullRequestRepository(),
            this.createProjectBoardRepository(),
        );
    }
    createInitialSetupUseCase(): InitialSetupUseCase {
        const issueRepository = this.createIssueRepository();
        return new InitialSetupUseCase(
            this.createOrganizationRepository(),
            issueRepository,
            issueRepository,
            issueRepository,
            this.createBranchRepository(),
            this.createRepositoryReleaseRepository(),
        );
    }

    createOrganizationRepository(): OrganizationRepository {
        return new OrganizationRepository(this.createOrganizationGithubClient());
    }

    createIssueRepository(): IssueRepository {
        const metadataRepository = this.createIssueMetadataRepository();
        const graphqlClient = new OctokitGraphqlClientAdapter();
        return new IssueRepository(
            this.createIssueContentRepository(),
            metadataRepository,
            this.createIssueLabelRepository(),
            this.createIssueAssignmentRepository(),
            this.createIssueLabelProvisioningRepository(),
            new IssueTypeRepository(graphqlClient),
            new IssueTypeAssignmentRepository((owner, repository, issueNumber, token) => metadataRepository.getId(owner, repository, issueNumber, token), graphqlClient),
            this.createIssueLifecycleRepository(),
            new OctokitIssueTitleClientAdapter(),
        );
    }

    createIssueAssignmentRepository(): IssueAssignmentRepository { return new IssueAssignmentRepository(new OctokitIssueAssignmentClientAdapter()); }
    createIssueContentRepository(): IssueContentRepository { return new IssueContentRepository(new OctokitIssueContentClientAdapter()); }
    createIssueLabelRepository(): IssueLabelRepository { return new IssueLabelRepository(new OctokitIssueLabelsClientAdapter()); }
    createIssueLabelProvisioningRepository(): IssueLabelProvisioningRepository { return new IssueLabelProvisioningRepository(new OctokitIssueLabelProvisioningClientAdapter()); }
    createIssueMetadataRepository(): IssueMetadataRepository { return new IssueMetadataRepository(new OctokitIssueMetadataClientAdapter(), new OctokitGraphqlClientAdapter()); }
    createIssueLifecycleRepository(): IssueLifecycleRepository { return new IssueLifecycleRepository(new OctokitIssueLifecycleClientAdapter()); }
    createIssueProgressLabelRepository(): IssueProgressLabelRepository {
        return new IssueProgressLabelRepository(this.createIssueLabelRepository());
    }
    createIssueTypeRepository(): IssueTypeRepository { return new IssueTypeRepository(new OctokitGraphqlClientAdapter()); }
    createIssueTypeAssignmentRepository(
        getIssueId: ConstructorParameters<typeof IssueTypeAssignmentRepository>[0],
    ): IssueTypeAssignmentRepository {
        return new IssueTypeAssignmentRepository(getIssueId, new OctokitGraphqlClientAdapter());
    }

    createProjectBoardRepository(): ProjectBoardRepository {
        return new ProjectBoardRepository(new OctokitProjectClientAdapter(), new OctokitGraphqlClientAdapter());
    }

    createPullRequestRepository(): PullRequestRepository {
        return new PullRequestRepository(this.createPullRequestChangesClient(), this.createGraphqlClient(), this.createPullRequestReviewClient(), this.createPullRequestLifecycleClient());
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

    createPullRequestReviewThreadRepository(): PullRequestReviewThreadRepository {
        return new PullRequestReviewThreadRepository(this.createGraphqlClient());
    }

    createRepositoryReleaseRepository(): RepositoryReleaseRepository {
        return new RepositoryReleaseRepository(new OctokitReleaseClientAdapter());
    }
}
