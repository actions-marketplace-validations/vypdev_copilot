
import { ActorAuthorizationRepository } from "../../data/repository/organization/actor_authorization_repository";
import { AuthenticatedUserRepository } from "../../data/repository/organization/authenticated_user_repository";
import { OrganizationMembersRepository } from "../../data/repository/organization/organization_members_repository";

import { IssueAssignmentRepository } from "../../data/repository/issue/issue_assignment_repository";
import { IssueContentRepository } from "../../data/repository/issue/issue_content_repository";
import { IssueLabelRepository } from "../../data/repository/issue/issue_label_repository";
import { IssueLabelProvisioningRepository } from "../../data/repository/issue/issue_label_provisioning_repository";
import { IssueLifecycleRepository } from "../../data/repository/issue/issue_lifecycle_repository";
import { IssueMetadataRepository } from "../../data/repository/issue/issue_metadata_repository";
import { IssueProgressLabelRepository } from "../../data/repository/issue/issue_progress_label_repository";
import { IssueTypeRepository } from "../../data/repository/issue/issue_type_repository";
import { IssueTypeAssignmentRepository } from "../../data/repository/issue/issue_type_assignment_repository";
import { IssueTitleRepository } from "../../data/repository/issue/issue_title_repository";
import { IssueClosureRepository } from "../../data/repository/issue/issue_closure_repository";
import { IssueNotificationRepository } from "../../data/repository/issue/issue_notification_repository";
import { IssueProgressTrackingRepository } from "../../data/repository/issue/issue_progress_tracking_repository";
import { ExecutionIssueSetupRepository } from "../../data/repository/issue/execution_issue_setup_repository";
import { BugbotIssueRepository } from "../../data/repository/issue/bugbot_issue_repository";
import { ProjectBoardRepository } from "../../data/repository/project/project_board_repository";
import { PullRequestChangesRepository } from "../../data/repository/pull_request/pull_request_changes_repository";
import { PullRequestLifecycleRepository } from "../../data/repository/pull_request/pull_request_lifecycle_repository";
import { PullRequestReviewRepository } from "../../data/repository/pull_request/pull_request_review_repository";
import { PullRequestReviewThreadRepository } from "../../data/repository/pull_request/pull_request_review_thread_repository";
import { BugbotPullRequestRepository } from "../../data/repository/pull_request/bugbot_pull_request_repository";

import { RepositoryReleaseRepository } from "../../data/repository/release/repository_release_repository";
import { OctokitBranchClientAdapter, OctokitBranchMergeClientAdapter, OctokitBranchComparisonClientAdapter, OctokitGraphqlClientAdapter, OctokitIssueAssignmentClientAdapter, OctokitIssueContentClientAdapter, OctokitIssueLabelProvisioningClientAdapter, OctokitIssueLabelsClientAdapter, OctokitIssueLifecycleClientAdapter, OctokitIssueMetadataClientAdapter, OctokitIssueTitleClientAdapter, OctokitOrganizationClientAdapter, OctokitProjectClientAdapter, OctokitPullRequestChangesClientAdapter, OctokitReleaseClientAdapter, OctokitPullRequestLifecycleClientAdapter, OctokitPullRequestReviewClientAdapter, OctokitWorkflowClientAdapter } from "../github/octokit_client";
import { IssueUseCase } from "../../application/usecases/issue_use_case";
import { PullRequestUseCase } from "../../application/usecases/pull_request_use_case";
import { InitialSetupUseCase } from "../../application/usecases/actions/initial_setup_use_case";
import { MergeRepository } from "../../data/repository/merge_repository";
import { BranchCompareRepository } from "../../data/repository/branch_compare_repository";
import { GitCliRepository } from "../../data/repository/git_cli_repository";
import { BranchLifecycleRepository } from "../../data/repository/branch_lifecycle_repository";
import { BranchNameRepository } from "../../data/repository/branch_name_repository";
import { BranchPreparationRepository } from "../../data/repository/branch/branch_preparation_repository";
import { LinkedBranchRepository } from "../../data/repository/branch/linked_branch_repository";
import { CheckProgressUseCase } from "../../application/usecases/actions/check_progress_use_case";
import { RecommendStepsUseCase } from "../../application/usecases/actions/recommend_steps_use_case";
import { AnswerIssueHelpUseCase } from "../../application/usecases/steps/issue/answer_issue_help_use_case";
import { UpdatePullRequestDescriptionUseCase } from "../../application/usecases/steps/pull_request/update_pull_request_description_use_case";
import { DefaultAgentRepositoryFactory } from "../../data/repository/agent_repository_factory";
import { WorkflowRepository } from "../../data/repository/workflow_repository";
import type { IssueProgressLabelProvisioningPort } from "../../application/ports/issue_ports";

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
    createGitCliRepository(): GitCliRepository { return new GitCliRepository(); }
    createBranchLifecycleRepository(): BranchLifecycleRepository {
        return new BranchLifecycleRepository(new OctokitBranchClientAdapter());
    }
    createBranchNameRepository(): BranchNameRepository {
        return new BranchNameRepository();
    }
    createBranchPreparationRepository(): BranchPreparationRepository {
        return new BranchPreparationRepository(
            new OctokitBranchClientAdapter(),
            this.createBranchNameRepository(),
            new LinkedBranchRepository(this.createGraphqlClient()),
            new GitCliRepository(),
        );
    }
    createWorkflowRepository(): WorkflowRepository {
        return new WorkflowRepository(new OctokitWorkflowClientAdapter());
    }
    createCheckProgressUseCase(): CheckProgressUseCase {
        return new CheckProgressUseCase(
            this.createIssueProgressTrackingRepository(),
            this.createBranchLifecycleRepository(),
            this.createPullRequestLifecycleRepository(),
            new DefaultAgentRepositoryFactory().createFindings(),
        );
    }

    createIssueUseCase(): IssueUseCase {
        const issueMetadataRepository = this.createIssueMetadataRepository();
        return new IssueUseCase(
            this.createProjectBoardRepository(),
            this.createOrganizationMembersRepository(),
            issueMetadataRepository,
            this.createProjectBoardRepository(),
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
    createPullRequestUseCase(): PullRequestUseCase {
        return new PullRequestUseCase(
            this.createProjectBoardRepository(),
            this.createPullRequestLifecycleRepository(),
            this.createIssueContentRepository(),
            this.createIssueTitleRepository(),
            this.createIssueClosureRepository(),
            this.createIssueAssignmentRepository(),
            this.createPullRequestReviewRepository(),
            this.createOrganizationMembersRepository(),
            this.createIssueLabelRepository(),
            this.createPullRequestLifecycleRepository(),
            this.createProjectBoardRepository(),
            new UpdatePullRequestDescriptionUseCase(this.createPullRequestLifecycleRepository(), this.createIssueContentRepository(), this.createOrganizationMembersRepository(), new DefaultAgentRepositoryFactory().createFindings()),
        );
    }
    createInitialSetupUseCase(): InitialSetupUseCase {
        return new InitialSetupUseCase(
            this.createAuthenticatedUserRepository(),
            this.createIssueLabelProvisioningRepository(),
            this.createIssueProgressLabelProvisioningPort(),
            this.createIssueTypeRepository(),
            this.createGitCliRepository(),
            this.createRepositoryReleaseRepository(),
        );
    }

    createAuthenticatedUserRepository(): AuthenticatedUserRepository {
        return new AuthenticatedUserRepository(this.createOrganizationGithubClient());
    }
    createActorAuthorizationRepository(): ActorAuthorizationRepository {
        return new ActorAuthorizationRepository(this.createOrganizationGithubClient());
    }


    createOrganizationMembersRepository(): OrganizationMembersRepository {
        return new OrganizationMembersRepository(this.createOrganizationGithubClient());
    }


    createIssueAssignmentRepository(): IssueAssignmentRepository { return new IssueAssignmentRepository(new OctokitIssueAssignmentClientAdapter()); }
    createIssueContentRepository(): IssueContentRepository { return new IssueContentRepository(new OctokitIssueContentClientAdapter()); }
    createBugbotIssueRepository(): BugbotIssueRepository { return new BugbotIssueRepository(this.createIssueContentRepository()); }
    createIssueLabelRepository(): IssueLabelRepository { return new IssueLabelRepository(new OctokitIssueLabelsClientAdapter()); }
    createIssueLabelProvisioningRepository(): IssueLabelProvisioningRepository { return new IssueLabelProvisioningRepository(new OctokitIssueLabelProvisioningClientAdapter()); }
    createIssueMetadataRepository(): IssueMetadataRepository { return new IssueMetadataRepository(new OctokitIssueMetadataClientAdapter(), new OctokitGraphqlClientAdapter()); }
    createIssueTitleRepository(metadataRepository = this.createIssueMetadataRepository()): IssueTitleRepository {
        return new IssueTitleRepository(new OctokitIssueTitleClientAdapter(), metadataRepository);
    }
    createIssueClosureRepository(): IssueClosureRepository {
        return new IssueClosureRepository(this.createIssueLifecycleRepository(), this.createIssueContentRepository());
    }
    createIssueNotificationRepository(): IssueNotificationRepository {
        return new IssueNotificationRepository(this.createIssueLifecycleRepository(), this.createIssueContentRepository());
    }
    createIssueLifecycleRepository(): IssueLifecycleRepository { return new IssueLifecycleRepository(new OctokitIssueLifecycleClientAdapter()); }
    createIssueProgressLabelRepository(): IssueProgressLabelRepository {
        return new IssueProgressLabelRepository(this.createIssueLabelRepository());
    }
    createIssueProgressTrackingRepository(): IssueProgressTrackingRepository {
        return new IssueProgressTrackingRepository(
            this.createIssueContentRepository(),
            this.createIssueLabelRepository(),
            this.createIssueProgressLabelRepository(),
        );
    }
    createExecutionIssueSetupRepository(): ExecutionIssueSetupRepository {
        return new ExecutionIssueSetupRepository(
            this.createIssueMetadataRepository(),
            this.createIssueContentRepository(),
            this.createIssueLabelRepository(),
        );
    }
    createIssueProgressLabelProvisioningPort(): IssueProgressLabelProvisioningPort {
        const progressRepository = this.createIssueProgressLabelRepository();
        const provisioningRepository = this.createIssueLabelProvisioningRepository();
        return {
            ensureProgressLabels: (owner, repository, token) => progressRepository.ensureProgressLabels(
                owner,
                repository,
                token,
                provisioningRepository.ensureLabel,
            ),
        };
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
    createBugbotPullRequestRepository(): BugbotPullRequestRepository {
        return new BugbotPullRequestRepository(
            this.createPullRequestLifecycleRepository(),
            this.createPullRequestChangesRepository(),
            this.createPullRequestReviewRepository(),
        );
    }

    createRepositoryReleaseRepository(): RepositoryReleaseRepository {
        return new RepositoryReleaseRepository(new OctokitReleaseClientAdapter());
    }
    createMergeRepository(): MergeRepository {
        return new MergeRepository(new OctokitBranchMergeClientAdapter());
    }
    createBranchCompareRepository(): BranchCompareRepository {
        return new BranchCompareRepository(new OctokitBranchComparisonClientAdapter());
    }
}
