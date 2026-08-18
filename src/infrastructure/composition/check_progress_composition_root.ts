import { CheckProgressUseCase } from "../../application/usecases/actions/check_progress_use_case";
import { createFindingsQueryPort } from './agent_capability_composition_root';
import { IssueContentRepository } from "../../data/repository/issue/issue_content_repository";
import { IssueLabelRepository } from "../../data/repository/issue/issue_label_repository";
import { IssueProgressLabelRepository } from "../../data/repository/issue/issue_progress_label_repository";
import { IssueProgressTrackingRepository } from "../../data/repository/issue/issue_progress_tracking_repository";
import { BranchLifecycleRepository } from "../../data/repository/branch_lifecycle_repository";
import { PullRequestLifecycleRepository } from "../../data/repository/pull_request/pull_request_lifecycle_repository";
import { GithubClientFactory } from "./github_client_factory";

export function createCheckProgressCompositionRoot(): CheckProgressUseCase {
    const clients = new GithubClientFactory();
    const labels = new IssueLabelRepository(clients.createIssueLabelsClient());
    return new CheckProgressUseCase(
        new IssueProgressTrackingRepository(
            new IssueContentRepository(clients.createIssueContentClient()),
            labels,
            new IssueProgressLabelRepository(new IssueLabelRepository(clients.createIssueLabelsClient())),
        ),
        new BranchLifecycleRepository(clients.createBranchClient()),
        new PullRequestLifecycleRepository(clients.createPullRequestLifecycleClient()),
        createFindingsQueryPort(),
    );
}
