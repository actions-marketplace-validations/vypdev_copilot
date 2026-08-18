import { DetectPotentialProblemsUseCase } from '../application/usecases/steps/commit/detect_potential_problems_use_case';
import { DetectBugbotFixIntentUseCase } from '../application/usecases/steps/commit/bugbot/detect_bugbot_fix_intent_use_case';
import { SingleActionUseCase } from '../application/usecases/single_action_use_case';
import { DeployedActionUseCase } from '../application/usecases/actions/deployed_action_use_case';
import { PublishGithubActionUseCase } from '../application/usecases/actions/publish_github_action_use_case';
import { CreateReleaseUseCase } from '../application/usecases/actions/create_release_use_case';
import { CreateTagUseCase } from '../application/usecases/actions/create_tag_use_case';
import { ThinkUseCase } from '../application/usecases/steps/common/think_use_case';
import { RecommendStepsUseCase } from '../application/usecases/actions/recommend_steps_use_case';
import { DefaultAgentRepositoryFactory } from '../data/repository/agent_repository_factory';
import { RepositoryFactory } from '../infrastructure/composition/repository_factory';
import { createInitialSetupCompositionRoot } from '../infrastructure/composition/initial_setup_composition_root';
import { createRepositoryReleasePort } from '../infrastructure/composition/release_composition_root';
import type { BugbotContextPorts, BugbotWritePorts } from '../application/ports/bugbot_ports';

export function createDetectPotentialProblemsUseCase(factory: RepositoryFactory): DetectPotentialProblemsUseCase {
    const issueRepository = factory.createBugbotIssueRepository();
    const pullRequestRepository = factory.createBugbotPullRequestRepository();
    const contextPorts: BugbotContextPorts = { issue: issueRepository, pullRequest: pullRequestRepository };
    const writePorts: BugbotWritePorts = { issueComments: issueRepository, pullRequestComments: pullRequestRepository };
    return new DetectPotentialProblemsUseCase(
        new DefaultAgentRepositoryFactory().createFindings(),
        contextPorts,
        writePorts,
    );
}

export function createBugbotContextPorts(factory: RepositoryFactory) {
    return {
        issue: factory.createBugbotIssueRepository(),
        pullRequest: factory.createBugbotPullRequestRepository(),
    };
}

export function createDetectBugbotFixIntentUseCase(factory: RepositoryFactory): DetectBugbotFixIntentUseCase {
    const contextPorts = createBugbotContextPorts(factory);
    return new DetectBugbotFixIntentUseCase(
        contextPorts.pullRequest,
        new DefaultAgentRepositoryFactory().createFindings(),
        contextPorts,
    );
}

export function createSingleActionUseCase(factory: RepositoryFactory): SingleActionUseCase {
    const repositoryReleasePort = createRepositoryReleasePort();
    const issueDescriptionQueryPort = factory.createIssueContentRepository();
    return new SingleActionUseCase(
        new DeployedActionUseCase(
            factory.createIssueLabelRepository(),
            factory.createIssueClosureRepository(),
            factory.createMergeRepository(),
        ),
        new PublishGithubActionUseCase(repositoryReleasePort),
        new CreateReleaseUseCase(repositoryReleasePort),
        new CreateTagUseCase(repositoryReleasePort),
        new ThinkUseCase(issueDescriptionQueryPort, factory.createIssueNotificationRepository(), new DefaultAgentRepositoryFactory().createFindings()),
        createInitialSetupCompositionRoot(),
        factory.createCheckProgressUseCase(),
        createDetectPotentialProblemsUseCase(factory),
        new RecommendStepsUseCase(issueDescriptionQueryPort, new DefaultAgentRepositoryFactory().createFindings()),
    );
}

