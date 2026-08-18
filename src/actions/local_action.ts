import { Ai } from '../data/model/ai';


import { Hotfix } from '../data/model/hotfix';





import { Release } from '../data/model/release';
import { SingleAction } from '../data/model/single_action';


import { Welcome } from '../data/model/welcome';
import { RepositoryFactory } from '../infrastructure/composition/repository_factory';

import { buildSizeThresholds } from './size_threshold_builder';
import { buildBranches } from './branches_builder';
import { buildExecution } from './execution_builder';
import { buildEmoji, buildImages, buildIssue, buildIssueTypes, buildLabels, buildLocale, buildProjects, buildPullRequest, buildTokens, buildWorkflows } from './configuration_builders';
import { mainRun } from './common_action';
import { renderLocalActionResults } from './local_action_output';
import { buildLocalActionConfiguration } from './local_action_configuration';

export async function runLocalAction(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Params shape is dynamic (CLI/action inputs)
    additionalParams: any
): Promise<void> {
    const repositoryFactory = new RepositoryFactory();
    const projectRepository = repositoryFactory.createProjectBoardRepository();

    const { debug, welcomeTitle, welcomeMessages, singleAction, singleActionIssue, singleActionVersion, singleActionTitle, singleActionChangelog, token, agentTasks, opencodeServerUrl, opencodeModel, aiPullRequestDescription, aiMembersOnly, aiIncludeReasoning, aiIgnoreFiles, bugbotSeverity, bugbotCommentLimit, bugbotFixVerifyCommands, projects, projectColumnIssueCreated, projectColumnPullRequestCreated, projectColumnIssueInProgress, projectColumnPullRequestInProgress, imageConfiguration, releaseWorkflow, hotfixWorkflow, titleEmoji, branchManagementEmoji, branchManagementLauncherLabel, bugfixLabel, bugLabel, hotfixLabel, enhancementLabel, featureLabel, releaseLabel, questionLabel, helpLabel, deployLabel, deployedLabel, docsLabel, documentationLabel, choreLabel, maintenanceLabel, priorityHighLabel, priorityMediumLabel, priorityLowLabel, priorityNoneLabel, sizeXxlLabel, sizeXlLabel, sizeLLabel, sizeMLabel, sizeSLabel, sizeXsLabel, issueTypeBug, issueTypeBugDescription, issueTypeBugColor, issueTypeHotfix, issueTypeHotfixDescription, issueTypeHotfixColor, issueTypeFeature, issueTypeFeatureDescription, issueTypeFeatureColor, issueTypeDocumentation, issueTypeDocumentationDescription, issueTypeDocumentationColor, issueTypeMaintenance, issueTypeMaintenanceDescription, issueTypeMaintenanceColor, issueTypeRelease, issueTypeReleaseDescription, issueTypeReleaseColor, issueTypeQuestion, issueTypeQuestionDescription, issueTypeQuestionColor, issueTypeHelp, issueTypeHelpDescription, issueTypeHelpColor, issueTypeTask, issueTypeTaskDescription, issueTypeTaskColor, issueLocale, pullRequestLocale, sizeXxlThresholdLines, sizeXxlThresholdFiles, sizeXxlThresholdCommits, sizeXlThresholdLines, sizeXlThresholdFiles, sizeXlThresholdCommits, sizeLThresholdLines, sizeLThresholdFiles, sizeLThresholdCommits, sizeMThresholdLines, sizeMThresholdFiles, sizeMThresholdCommits, sizeSThresholdLines, sizeSThresholdFiles, sizeSThresholdCommits, sizeXsThresholdLines, sizeXsThresholdFiles, sizeXsThresholdCommits, mainBranch, developmentBranch, featureTree, bugfixTree, hotfixTree, releaseTree, docsTree, choreTree, commitPrefixBuilder, branchManagementAlways, reopenIssueOnPush, issueDesiredAssigneesCount, pullRequestDesiredAssigneesCount, pullRequestDesiredReviewersCount, pullRequestMergeTimeout } = await buildLocalActionConfiguration(additionalParams, projectRepository);

    const execution = buildExecution({
        debug,
        singleAction: new SingleAction(
            singleAction,
            singleActionIssue,
            singleActionVersion,
            singleActionTitle,
            singleActionChangelog,
        ),
        commitPrefixBuilder,
        issue: buildIssue(branchManagementAlways, reopenIssueOnPush, issueDesiredAssigneesCount, additionalParams),
        pullRequest: buildPullRequest(pullRequestDesiredAssigneesCount, pullRequestDesiredReviewersCount, pullRequestMergeTimeout, additionalParams),
        emoji: buildEmoji(titleEmoji, branchManagementEmoji),
        images: buildImages({
            onIssue: imageConfiguration.onIssue,
            onPullRequest: imageConfiguration.onPullRequest,
            onCommit: imageConfiguration.onCommit,
            issue: imageConfiguration.issue,
            pullRequest: imageConfiguration.pullRequest,
            commit: imageConfiguration.commit,
        }),
        tokens: buildTokens(token),
        ai: new Ai(
            opencodeServerUrl,
            opencodeModel,
            aiPullRequestDescription,
            aiMembersOnly,
            aiIgnoreFiles,
            aiIncludeReasoning,
            bugbotSeverity,
            bugbotCommentLimit,
            bugbotFixVerifyCommands,
            agentTasks,
        ),
        labels: buildLabels({
            branching: { launcher: branchManagementLauncherLabel },
            workflow: { bug: bugLabel, bugfix: bugfixLabel, hotfix: hotfixLabel, enhancement: enhancementLabel, feature: featureLabel, release: releaseLabel, question: questionLabel, help: helpLabel, deploy: deployLabel, deployed: deployedLabel, docs: docsLabel, documentation: documentationLabel, chore: choreLabel, maintenance: maintenanceLabel },
            priorities: { high: priorityHighLabel, medium: priorityMediumLabel, low: priorityLowLabel, none: priorityNoneLabel },
            sizes: { xxl: sizeXxlLabel, xl: sizeXlLabel, l: sizeLLabel, m: sizeMLabel, s: sizeSLabel, xs: sizeXsLabel },
        }),
        issueTypes: buildIssueTypes({
            task: { name: issueTypeTask, description: issueTypeTaskDescription, color: issueTypeTaskColor },
            bug: { name: issueTypeBug, description: issueTypeBugDescription, color: issueTypeBugColor },
            feature: { name: issueTypeFeature, description: issueTypeFeatureDescription, color: issueTypeFeatureColor },
            documentation: { name: issueTypeDocumentation, description: issueTypeDocumentationDescription, color: issueTypeDocumentationColor },
            maintenance: { name: issueTypeMaintenance, description: issueTypeMaintenanceDescription, color: issueTypeMaintenanceColor },
            hotfix: { name: issueTypeHotfix, description: issueTypeHotfixDescription, color: issueTypeHotfixColor },
            release: { name: issueTypeRelease, description: issueTypeReleaseDescription, color: issueTypeReleaseColor },
            question: { name: issueTypeQuestion, description: issueTypeQuestionDescription, color: issueTypeQuestionColor },
            help: { name: issueTypeHelp, description: issueTypeHelpDescription, color: issueTypeHelpColor },
        }),
        locale: buildLocale(issueLocale, pullRequestLocale),
        sizeThresholds: buildSizeThresholds({
            xxl: { lines: sizeXxlThresholdLines, files: sizeXxlThresholdFiles, commits: sizeXxlThresholdCommits },
            xl: { lines: sizeXlThresholdLines, files: sizeXlThresholdFiles, commits: sizeXlThresholdCommits },
            l: { lines: sizeLThresholdLines, files: sizeLThresholdFiles, commits: sizeLThresholdCommits },
            m: { lines: sizeMThresholdLines, files: sizeMThresholdFiles, commits: sizeMThresholdCommits },
            s: { lines: sizeSThresholdLines, files: sizeSThresholdFiles, commits: sizeSThresholdCommits },
            xs: { lines: sizeXsThresholdLines, files: sizeXsThresholdFiles, commits: sizeXsThresholdCommits },
        }),
        branches: buildBranches({
            main: mainBranch,
            defaultBranch: mainBranch,
            development: developmentBranch,
            featureTree,
            bugfixTree,
            hotfixTree,
            releaseTree,
            docsTree,
            choreTree,
        }),
        release: new Release(),
        hotfix: new Hotfix(),
        workflows: buildWorkflows(releaseWorkflow, hotfixWorkflow),
        projects: buildProjects({
            projects,
            issueCreated: projectColumnIssueCreated,
            pullRequestCreated: projectColumnPullRequestCreated,
            issueInProgress: projectColumnIssueInProgress,
            pullRequestInProgress: projectColumnPullRequestInProgress,
        }),
        welcome: new Welcome(welcomeTitle ?? '', welcomeMessages ?? []),
        inputs: additionalParams,
    });

    const results = await mainRun(execution, projectRepository, repositoryFactory.createGitCliRepository());

    renderLocalActionResults(results);
}
