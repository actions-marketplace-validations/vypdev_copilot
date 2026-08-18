import { IssueUseCase } from '../../application/usecases/issue_use_case';
import { AnswerIssueHelpUseCase } from '../../application/usecases/steps/issue/answer_issue_help_use_case';
import { RecommendStepsUseCase } from '../../application/usecases/actions/recommend_steps_use_case';
import { DefaultAgentRepositoryFactory } from '../../data/repository/agent_repository_factory';
import { BranchLifecycleRepository } from '../../data/repository/branch_lifecycle_repository';
import { BranchNameRepository } from '../../data/repository/branch_name_repository';
import { BranchPreparationRepository } from '../../data/repository/branch/branch_preparation_repository';
import { LinkedBranchRepository } from '../../data/repository/branch/linked_branch_repository';
import { GitCliRepository } from '../../data/repository/git_cli_repository';
import { IssueAssignmentRepository } from '../../data/repository/issue/issue_assignment_repository';
import { IssueClosureRepository } from '../../data/repository/issue/issue_closure_repository';
import { IssueContentRepository } from '../../data/repository/issue/issue_content_repository';
import { IssueLifecycleRepository } from '../../data/repository/issue/issue_lifecycle_repository';
import { IssueMetadataRepository } from '../../data/repository/issue/issue_metadata_repository';
import { IssueNotificationRepository } from '../../data/repository/issue/issue_notification_repository';
import { IssueTitleRepository } from '../../data/repository/issue/issue_title_repository';
import { IssueTypeAssignmentRepository } from '../../data/repository/issue/issue_type_assignment_repository';
import { WorkflowRepository } from '../../data/repository/workflow_repository';
import { composeIssueUseCase } from './issue_use_case_composition';
import { createOrganizationMembersCompositionRoot } from './organization_members_composition_root';
import { createProjectBoardCompositionRoot } from './project_board_composition_root';
import { GithubClientFactory } from './github_client_factory';

export function createIssueUseCaseCompositionRoot(): IssueUseCase {
    const clients = new GithubClientFactory();
    const issueMetadata = new IssueMetadataRepository(clients.createIssueMetadataClient(), clients.createGraphqlTransportClient());
    const issueContent = new IssueContentRepository(clients.createIssueContentClient());
    const issueLifecycle = new IssueLifecycleRepository(clients.createIssueLifecycleClient());
    const issueNotification = new IssueNotificationRepository(issueLifecycle, issueContent);
    const branchName = new BranchNameRepository();
    const branchPreparation = new BranchPreparationRepository(
        clients.createBranchClient(),
        branchName,
        new LinkedBranchRepository(clients.createGraphqlTransportClient()),
        new GitCliRepository(),
    );

    return composeIssueUseCase(
        createProjectBoardCompositionRoot(),
        createOrganizationMembersCompositionRoot(),
        issueMetadata,
        createProjectBoardCompositionRoot(),
        new IssueTitleRepository(clients.createIssueTitleClient(), issueMetadata),
        new IssueAssignmentRepository(clients.createIssueAssignmentClient()),
        new IssueClosureRepository(issueLifecycle, issueContent),
        new IssueTypeAssignmentRepository(
            (owner, repository, issueNumber, token) => issueMetadata.getId(owner, repository, issueNumber, token),
            clients.createGraphqlTransportClient(),
        ),
        issueContent,
        issueNotification,
        new BranchLifecycleRepository(clients.createBranchClient()),
        branchName,
        branchPreparation,
        new WorkflowRepository(clients.createWorkflowClient()),
        new RecommendStepsUseCase(issueContent, new DefaultAgentRepositoryFactory().createFindings()),
        new AnswerIssueHelpUseCase(issueNotification, new DefaultAgentRepositoryFactory().createFindings()),
    );
}
