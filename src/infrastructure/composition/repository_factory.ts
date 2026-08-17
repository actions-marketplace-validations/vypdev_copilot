import { OrganizationRepository } from "../../data/repository/organization/organization_repository";
import { IssueRepository } from "../../data/repository/issue_repository";
import { ProjectBoardRepository } from "../../data/repository/project/project_board_repository";
import { PullRequestChangesRepository } from "../../data/repository/pull_request/pull_request_changes_repository";
import { PullRequestLifecycleRepository } from "../../data/repository/pull_request/pull_request_lifecycle_repository";
import { PullRequestReviewRepository } from "../../data/repository/pull_request/pull_request_review_repository";
import { PullRequestReviewThreadRepository } from "../../data/repository/pull_request/pull_request_review_thread_repository";
import { PullRequestRepository } from "../../data/repository/pull_request_repository";
import { RepositoryReleaseRepository } from "../../data/repository/release/repository_release_repository";

export class RepositoryFactory {
    createOrganizationRepository(): OrganizationRepository {
        return new OrganizationRepository();
    }

    createIssueRepository(): IssueRepository {
        return new IssueRepository();
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
