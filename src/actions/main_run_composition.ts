import { createBranchMergeClient } from '../infrastructure/composition/github_branch_client_factory';
import { createReleaseClient } from '../infrastructure/composition/github_release_client_factory';
import { createCheckProgressCompositionRoot } from '../infrastructure/composition/check_progress_composition_root';
import { DetectPotentialProblemsUseCase } from '../application/usecases/steps/commit/detect_potential_problems_use_case';
import { DetectBugbotFixIntentUseCase } from '../application/usecases/steps/commit/bugbot/detect_bugbot_fix_intent_use_case';
import { SingleActionUseCase } from '../application/usecases/single_action_use_case';
import { DeployedActionUseCase } from '../application/usecases/actions/deployed_action_use_case';
import { PublishGithubActionUseCase } from '../application/usecases/actions/publish_github_action_use_case';
import { CreateReleaseUseCase } from '../application/usecases/actions/create_release_use_case';
import { CreateTagUseCase } from '../application/usecases/actions/create_tag_use_case';
import { ThinkUseCase } from '../application/usecases/steps/common/think_use_case';
import { RecommendStepsUseCase } from '../application/usecases/actions/recommend_steps_use_case';
import { createFindingsQueryPort } from '../infrastructure/composition/agent_capability_composition_root';
import { createBugbotCompositionRoot } from '../infrastructure/composition/bugbot_composition_root';
import { createInitialSetupCompositionRoot } from '../infrastructure/composition/initial_setup_composition_root';
import { createIssueContentCompositionRoot } from '../infrastructure/composition/issue_content_composition_root';
import { createIssueClosureRepository, createIssueNotificationRepository } from '../infrastructure/composition/issue_interaction_composition_root';
import { createIssueLabelRepository } from '../infrastructure/composition/issue_labels_composition_root';
import { RepositoryTagRepository } from '../data/repository/release/repository_tag_repository';
import { RepositoryReleasePublicationRepository } from '../data/repository/release/repository_release_publication_repository';
import { MergeRepository } from '../data/repository/merge_repository';

export function createDetectPotentialProblemsUseCase(): DetectPotentialProblemsUseCase {
    const bugbot = createBugbotCompositionRoot();
    return new DetectPotentialProblemsUseCase(
        createFindingsQueryPort(),
        bugbot.context,
        bugbot.write,
    );
}

export function createDetectBugbotFixIntentUseCase(): DetectBugbotFixIntentUseCase {
    const contextPorts = createBugbotCompositionRoot().context;
    return new DetectBugbotFixIntentUseCase(
        contextPorts.pullRequest,
        createFindingsQueryPort(),
        contextPorts,
    );
}

export function createSingleActionUseCase(): SingleActionUseCase {
    const repositoryTagPort = new RepositoryTagRepository(createReleaseClient());
    const repositoryReleasePort = new RepositoryReleasePublicationRepository(createReleaseClient());
    const issueDescriptionQueryPort = createIssueContentCompositionRoot();
    return new SingleActionUseCase(
        new DeployedActionUseCase(
            createIssueLabelRepository(),
            createIssueClosureRepository(),
            new MergeRepository(createBranchMergeClient()),
        ),
        new PublishGithubActionUseCase(repositoryTagPort, repositoryReleasePort),
        new CreateReleaseUseCase(repositoryReleasePort),
        new CreateTagUseCase(repositoryTagPort),
        new ThinkUseCase(issueDescriptionQueryPort, createIssueNotificationRepository(), createFindingsQueryPort()),
        createInitialSetupCompositionRoot(),
        createCheckProgressCompositionRoot(),
        createDetectPotentialProblemsUseCase(),
        new RecommendStepsUseCase(issueDescriptionQueryPort, createFindingsQueryPort()),
    );
}

