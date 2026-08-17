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
import { OctokitClientAdapter } from "../github/octokit_client";
import { IssueUseCase } from "../../application/usecases/issue_use_case";
import { PullRequestUseCase } from "../../application/usecases/pull_request_use_case";
import { InitialSetupUseCase } from "../../application/usecases/actions/initial_setup_use_case";
import { BranchRepository } from "../../data/repository/branch_repository";
import { CheckProgressUseCase } from "../../application/usecases/actions/check_progress_use_case";

export class RepositoryFactory {
    createGithubClient(): OctokitClientAdapter {
        return new OctokitClientAdapter();
    }
    createBranchRepository(): BranchRepository {
        return new BranchRepository();
    }
    createCheckProgressUseCase(): CheckProgressUseCase {
        const issueRepository = this.createIssueRepository();
        return new CheckProgressUseCase(
            issueRepository,
            this.createBranchRepository(),
            this.createPullRequestRepository(),
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
            new BranchRepository(),
            this.createRepositoryReleaseRepository(),
        );
    }

    createOrganizationRepository(): OrganizationRepository {
        return new OrganizationRepository();
    }

    createIssueRepository(): IssueRepository {
        return new IssueRepository();
    }

    createIssueAssignmentRepository(): IssueAssignmentRepository { return new IssueAssignmentRepository(); }
    createIssueContentRepository(): IssueContentRepository { return new IssueContentRepository(); }
    createIssueLabelRepository(): IssueLabelRepository { return new IssueLabelRepository(); }
    createIssueLabelProvisioningRepository(): IssueLabelProvisioningRepository { return new IssueLabelProvisioningRepository(); }
    createIssueLifecycleRepository(): IssueLifecycleRepository { return new IssueLifecycleRepository(); }
    createIssueMetadataRepository(): IssueMetadataRepository { return new IssueMetadataRepository(); }
    createIssueProgressLabelRepository(): IssueProgressLabelRepository {
        return new IssueProgressLabelRepository(this.createIssueLabelRepository());
    }
    createIssueTypeRepository(): IssueTypeRepository { return new IssueTypeRepository(); }
    createIssueTypeAssignmentRepository(getIssueId: ConstructorParameters<typeof IssueTypeAssignmentRepository>[0]): IssueTypeAssignmentRepository {
        return new IssueTypeAssignmentRepository(getIssueId);
    }

    createProjectBoardRepository(): ProjectBoardRepository {
        return new ProjectBoardRepository();
    }

    createPullRequestRepository(): PullRequestRepository {
        return new PullRequestRepository();
    }

    createPullRequestChangesRepository(): PullRequestChangesRepository {
        return new PullRequestChangesRepository();
    }

    createPullRequestLifecycleRepository(): PullRequestLifecycleRepository {
        return new PullRequestLifecycleRepository();
    }

    createPullRequestReviewRepository(): PullRequestReviewRepository {
        return new PullRequestReviewRepository();
    }

    createPullRequestReviewThreadRepository(): PullRequestReviewThreadRepository {
        return new PullRequestReviewThreadRepository();
    }

    createRepositoryReleaseRepository(): RepositoryReleaseRepository {
        return new RepositoryReleaseRepository();
    }
}
