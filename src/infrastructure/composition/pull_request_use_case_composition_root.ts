import { PullRequestUseCase } from '../../application/usecases/pull_request_use_case';
import { UpdatePullRequestDescriptionUseCase } from '../../application/usecases/steps/pull_request/update_pull_request_description_use_case';
import { DefaultAgentRepositoryFactory } from '../../data/repository/agent_repository_factory';
import { IssueAssignmentRepository } from '../../data/repository/issue/issue_assignment_repository';
import { IssueClosureRepository } from '../../data/repository/issue/issue_closure_repository';
import { IssueContentRepository } from '../../data/repository/issue/issue_content_repository';
import { IssueLabelRepository } from '../../data/repository/issue/issue_label_repository';
import { IssueLifecycleRepository } from '../../data/repository/issue/issue_lifecycle_repository';
import { IssueMetadataRepository } from '../../data/repository/issue/issue_metadata_repository';
import { IssueTitleRepository } from '../../data/repository/issue/issue_title_repository';
import { PullRequestLifecycleRepository } from '../../data/repository/pull_request/pull_request_lifecycle_repository';
import { PullRequestReviewRepository } from '../../data/repository/pull_request/pull_request_review_repository';
import { composePullRequestUseCase } from './pull_request_use_case_composition';
import { createOrganizationMembersCompositionRoot } from './organization_members_composition_root';
import { createProjectBoardCompositionRoot } from './project_board_composition_root';
import { GithubClientFactory } from './github_client_factory';

export function createPullRequestUseCaseCompositionRoot(): PullRequestUseCase {
    const clients = new GithubClientFactory();
    const issueLifecycle = new IssueLifecycleRepository(clients.createIssueLifecycleClient());
    const issueContent = new IssueContentRepository(clients.createIssueContentClient());
    const pullRequestLifecycle = new PullRequestLifecycleRepository(clients.createPullRequestLifecycleClient());
    const issueMetadata = new IssueMetadataRepository(clients.createIssueMetadataClient(), clients.createGraphqlClient());
    const organizationMembers = createOrganizationMembersCompositionRoot();

    return composePullRequestUseCase(
        createProjectBoardCompositionRoot(),
        pullRequestLifecycle,
        issueContent,
        new IssueTitleRepository(clients.createIssueTitleClient(), issueMetadata),
        new IssueClosureRepository(issueLifecycle, issueContent),
        new IssueAssignmentRepository(clients.createIssueAssignmentClient()),
        new PullRequestReviewRepository(clients.createPullRequestReviewClient(), clients.createGraphqlClient()),
        organizationMembers,
        new IssueLabelRepository(clients.createIssueLabelsClient()),
        pullRequestLifecycle,
        createProjectBoardCompositionRoot(),
        new UpdatePullRequestDescriptionUseCase(
            pullRequestLifecycle,
            issueContent,
            organizationMembers,
            new DefaultAgentRepositoryFactory().createFindings(),
        ),
    );
}
