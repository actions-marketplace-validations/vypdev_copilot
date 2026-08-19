import * as core from '@actions/core';
import * as github from '@actions/github';
import { Ai } from '../data/model/ai';


import { Execution } from '../data/model/execution';
import { Hotfix } from '../data/model/hotfix';




import { Locale } from '../data/model/locale';

import { Release } from '../data/model/release';
import { Result } from '../data/model/result';
import { SingleAction } from '../data/model/single_action';


import { finishGithubAction } from './github_action_completion';
import { BUGBOT_MAX_COMMENTS, BUGBOT_MIN_SEVERITY, INPUT_KEYS } from '../utils/constants';
import { logDebugInfo, logError, logInfo } from '../utils/logger';
import type { ManagedAgentServer } from '../application/ports/agent_server_ports';
import { OpenCodeServerLifecycleAdapter } from '../data/repository/opencode_server_lifecycle_adapter';
import { GitCliRepository } from '../data/repository/git_cli_repository';
import { createIssueContentCompositionRoot } from '../infrastructure/composition/issue_content_composition_root';
import type { IssueContentRepository } from '../data/repository/issue/issue_content_repository';
import { createIssueNotificationRepository } from '../infrastructure/composition/issue_interaction_composition_root';
import { createProjectBoardCompositionRoot } from '../infrastructure/composition/project_board_composition_root';
import { ConfigurationHandler } from '../manager/description/configuration_handler';
import { loadProjectDetails } from './project_details_loader';
import { mainRun } from './common_action';
import { isEnabledInput } from './input_boolean_policy';
import { getGithubActionInput } from './github_action_input';
import { parseBoundedPositiveIntegerInput, parseIntegerInput } from './input_number_policy';
import { parseDelimitedValues } from './input_values_policy';
import { buildAgentTasksFromInputs } from './agent_input_builder';
import { buildImageConfiguration } from './image_configuration_builder';
import { buildSizeThresholds } from './size_threshold_builder';
import { buildBranches } from './branches_builder';
import { buildExecution } from './execution_builder';
import { buildEmoji, buildImages, buildIssue, buildIssueTypes, buildLabels, buildLocale, buildProjects, buildPullRequest, buildTokens, buildWorkflows } from './configuration_builders';

export async function runGitHubAction(): Promise<void> {
    const eventInputs = { ...github.context.payload, eventName: github.context.eventName };
    const projectBoard = createProjectBoardCompositionRoot();

    logInfo('GitHub Action: runGitHubAction started.');

    /**
     * Debug
     */
    const debug = isEnabledInput(getGithubActionInput(INPUT_KEYS.DEBUG));
    if (debug) {
        logInfo('Debug mode is enabled. Full logs will be included in the report.');
    }

    /**
     * Single action
     */
    const singleAction = getGithubActionInput(INPUT_KEYS.SINGLE_ACTION);
    const singleActionIssue = getGithubActionInput(INPUT_KEYS.SINGLE_ACTION_ISSUE);
    const singleActionVersion = getGithubActionInput(INPUT_KEYS.SINGLE_ACTION_VERSION);
    const singleActionTitle = getGithubActionInput(INPUT_KEYS.SINGLE_ACTION_TITLE);
    const singleActionChangelog = getGithubActionInput(INPUT_KEYS.SINGLE_ACTION_CHANGELOG);

    /**
     * Tokens
     */
    const token = getGithubActionInput(INPUT_KEYS.TOKEN, {required: true});

    /**
     * AI (OpenCode)
     */
    let opencodeServerUrl = getGithubActionInput(INPUT_KEYS.OPENCODE_SERVER_URL) || 'http://127.0.0.1:4096';
    const readAgentInput = (key: string): string => getGithubActionInput(key);
    const requestedAgentTasks = buildAgentTasksFromInputs(readAgentInput);
    const opencodeModel = requestedAgentTasks.findings.model;
    const opencodeStartServer = isEnabledInput(getGithubActionInput(INPUT_KEYS.OPENCODE_START_SERVER))
        && requestedAgentTasks.findings.provider === 'opencode'
        && requestedAgentTasks.findings.transport === 'server';

    const lifecycle: OpenCodeServerLifecycleAdapter = new OpenCodeServerLifecycleAdapter();
    let managedOpencodeServer: ManagedAgentServer | undefined;
    if (opencodeStartServer) {
        logInfo('Starting managed OpenCode server...');
        managedOpencodeServer = await lifecycle.start({ cwd: process.cwd() });
        opencodeServerUrl = managedOpencodeServer.url;
        logInfo(`OpenCode server started at ${opencodeServerUrl}.`);
    } else {
        logDebugInfo(`Using OpenCode server URL: ${opencodeServerUrl}, model: ${opencodeModel}.`);
    }
    const agentTasks = buildAgentTasksFromInputs((key) =>
        key === INPUT_KEYS.OPENCODE_SERVER_URL ? opencodeServerUrl : readAgentInput(key)
    );


    try {
    const aiPullRequestDescription = isEnabledInput(getGithubActionInput(INPUT_KEYS.AI_PULL_REQUEST_DESCRIPTION));
    const aiMembersOnly = isEnabledInput(getGithubActionInput(INPUT_KEYS.AI_MEMBERS_ONLY));
    const aiIncludeReasoning = isEnabledInput(getGithubActionInput(INPUT_KEYS.AI_INCLUDE_REASONING));
    const aiIgnoreFilesInput: string = getGithubActionInput(INPUT_KEYS.AI_IGNORE_FILES);
    const aiIgnoreFiles: string[] = parseDelimitedValues(aiIgnoreFilesInput);
    const bugbotSeverity = getGithubActionInput(INPUT_KEYS.BUGBOT_SEVERITY) || BUGBOT_MIN_SEVERITY;
    const bugbotCommentLimit = parseBoundedPositiveIntegerInput(
        getGithubActionInput(INPUT_KEYS.BUGBOT_COMMENT_LIMIT),
        BUGBOT_MAX_COMMENTS,
        200,
    );
    const bugbotFixVerifyCommandsInput = getGithubActionInput(INPUT_KEYS.BUGBOT_FIX_VERIFY_COMMANDS);
    const bugbotFixVerifyCommands = bugbotFixVerifyCommandsInput
        .split(',')
        .map((c) => c.trim())
        .filter((c) => c.length > 0);

    /**
     * Projects Details
     */
    const projectIdsInput: string = getGithubActionInput(INPUT_KEYS.PROJECT_IDS);
    const projectIds: string[] = parseDelimitedValues(projectIdsInput);

    const projects = await loadProjectDetails(projectBoard.query, projectIds, token);

    const projectColumnIssueCreated = getGithubActionInput(INPUT_KEYS.PROJECT_COLUMN_ISSUE_CREATED)
    const projectColumnPullRequestCreated = getGithubActionInput(INPUT_KEYS.PROJECT_COLUMN_PULL_REQUEST_CREATED)
    const projectColumnIssueInProgress = getGithubActionInput(INPUT_KEYS.PROJECT_COLUMN_ISSUE_IN_PROGRESS)
    const projectColumnPullRequestInProgress = getGithubActionInput(INPUT_KEYS.PROJECT_COLUMN_PULL_REQUEST_IN_PROGRESS)

    /**
     * Images
     */
    const imageConfiguration = buildImageConfiguration(getGithubActionInput);
    /**
     * Workflows
     */
    const releaseWorkflow = getGithubActionInput(INPUT_KEYS.RELEASE_WORKFLOW);
    const hotfixWorkflow = getGithubActionInput(INPUT_KEYS.HOTFIX_WORKFLOW);

    /**
     * Emoji-title
     */
    const titleEmoji = getGithubActionInput(INPUT_KEYS.EMOJI_LABELED_TITLE) === 'true';
    const branchManagementEmoji = getGithubActionInput(INPUT_KEYS.BRANCH_MANAGEMENT_EMOJI);

    /**
     * Labels
     */
    const branchManagementLauncherLabel = getGithubActionInput(INPUT_KEYS.BRANCH_MANAGEMENT_LAUNCHER_LABEL);
    const bugfixLabel = getGithubActionInput(INPUT_KEYS.BUGFIX_LABEL);
    const bugLabel = getGithubActionInput(INPUT_KEYS.BUG_LABEL);
    const hotfixLabel = getGithubActionInput(INPUT_KEYS.HOTFIX_LABEL);
    const enhancementLabel = getGithubActionInput(INPUT_KEYS.ENHANCEMENT_LABEL);
    const featureLabel = getGithubActionInput(INPUT_KEYS.FEATURE_LABEL);
    const releaseLabel = getGithubActionInput(INPUT_KEYS.RELEASE_LABEL);
    const questionLabel = getGithubActionInput(INPUT_KEYS.QUESTION_LABEL);
    const helpLabel = getGithubActionInput(INPUT_KEYS.HELP_LABEL);
    const deployLabel = getGithubActionInput(INPUT_KEYS.DEPLOY_LABEL);
    const deployedLabel = getGithubActionInput(INPUT_KEYS.DEPLOYED_LABEL);
    const docsLabel = getGithubActionInput(INPUT_KEYS.DOCS_LABEL);
    const documentationLabel = getGithubActionInput(INPUT_KEYS.DOCUMENTATION_LABEL);
    const choreLabel = getGithubActionInput(INPUT_KEYS.CHORE_LABEL);
    const maintenanceLabel = getGithubActionInput(INPUT_KEYS.MAINTENANCE_LABEL);
    const priorityHighLabel = getGithubActionInput(INPUT_KEYS.PRIORITY_HIGH_LABEL);
    const priorityMediumLabel = getGithubActionInput(INPUT_KEYS.PRIORITY_MEDIUM_LABEL);
    const priorityLowLabel = getGithubActionInput(INPUT_KEYS.PRIORITY_LOW_LABEL);
    const priorityNoneLabel = getGithubActionInput(INPUT_KEYS.PRIORITY_NONE_LABEL);
    const sizeXxlLabel = getGithubActionInput(INPUT_KEYS.SIZE_XXL_LABEL);
    const sizeXlLabel = getGithubActionInput(INPUT_KEYS.SIZE_XL_LABEL);
    const sizeLLabel = getGithubActionInput(INPUT_KEYS.SIZE_L_LABEL);
    const sizeMLabel = getGithubActionInput(INPUT_KEYS.SIZE_M_LABEL);
    const sizeSLabel = getGithubActionInput(INPUT_KEYS.SIZE_S_LABEL);
    const sizeXsLabel = getGithubActionInput(INPUT_KEYS.SIZE_XS_LABEL);

    /**
     * Issue Types
     */
    const issueTypeBug = getGithubActionInput(INPUT_KEYS.ISSUE_TYPE_BUG);
    const issueTypeBugDescription = getGithubActionInput(INPUT_KEYS.ISSUE_TYPE_BUG_DESCRIPTION);
    const issueTypeBugColor = getGithubActionInput(INPUT_KEYS.ISSUE_TYPE_BUG_COLOR);

    const issueTypeHotfix = getGithubActionInput(INPUT_KEYS.ISSUE_TYPE_HOTFIX);
    const issueTypeHotfixDescription = getGithubActionInput(INPUT_KEYS.ISSUE_TYPE_HOTFIX_DESCRIPTION);
    const issueTypeHotfixColor = getGithubActionInput(INPUT_KEYS.ISSUE_TYPE_HOTFIX_COLOR);

    const issueTypeFeature = getGithubActionInput(INPUT_KEYS.ISSUE_TYPE_FEATURE);
    const issueTypeFeatureDescription = getGithubActionInput(INPUT_KEYS.ISSUE_TYPE_FEATURE_DESCRIPTION);
    const issueTypeFeatureColor = getGithubActionInput(INPUT_KEYS.ISSUE_TYPE_FEATURE_COLOR);

    const issueTypeDocumentation = getGithubActionInput(INPUT_KEYS.ISSUE_TYPE_DOCUMENTATION);
    const issueTypeDocumentationDescription = getGithubActionInput(INPUT_KEYS.ISSUE_TYPE_DOCUMENTATION_DESCRIPTION);
    const issueTypeDocumentationColor = getGithubActionInput(INPUT_KEYS.ISSUE_TYPE_DOCUMENTATION_COLOR);

    const issueTypeMaintenance = getGithubActionInput(INPUT_KEYS.ISSUE_TYPE_MAINTENANCE);
    const issueTypeMaintenanceDescription = getGithubActionInput(INPUT_KEYS.ISSUE_TYPE_MAINTENANCE_DESCRIPTION);
    const issueTypeMaintenanceColor = getGithubActionInput(INPUT_KEYS.ISSUE_TYPE_MAINTENANCE_COLOR);

    const issueTypeRelease = getGithubActionInput(INPUT_KEYS.ISSUE_TYPE_RELEASE);
    const issueTypeReleaseDescription = getGithubActionInput(INPUT_KEYS.ISSUE_TYPE_RELEASE_DESCRIPTION);
    const issueTypeReleaseColor = getGithubActionInput(INPUT_KEYS.ISSUE_TYPE_RELEASE_COLOR);

    const issueTypeQuestion = getGithubActionInput(INPUT_KEYS.ISSUE_TYPE_QUESTION);
    const issueTypeQuestionDescription = getGithubActionInput(INPUT_KEYS.ISSUE_TYPE_QUESTION_DESCRIPTION);
    const issueTypeQuestionColor = getGithubActionInput(INPUT_KEYS.ISSUE_TYPE_QUESTION_COLOR);

    const issueTypeHelp = getGithubActionInput(INPUT_KEYS.ISSUE_TYPE_HELP);
    const issueTypeHelpDescription = getGithubActionInput(INPUT_KEYS.ISSUE_TYPE_HELP_DESCRIPTION);
    const issueTypeHelpColor = getGithubActionInput(INPUT_KEYS.ISSUE_TYPE_HELP_COLOR);

    const issueTypeTask = getGithubActionInput(INPUT_KEYS.ISSUE_TYPE_TASK);
    const issueTypeTaskDescription = getGithubActionInput(INPUT_KEYS.ISSUE_TYPE_TASK_DESCRIPTION);
    const issueTypeTaskColor = getGithubActionInput(INPUT_KEYS.ISSUE_TYPE_TASK_COLOR);

    /**
     * Locale
     */
    const issueLocale = getGithubActionInput(INPUT_KEYS.ISSUES_LOCALE) ?? Locale.DEFAULT;
    const pullRequestLocale = getGithubActionInput(INPUT_KEYS.PULL_REQUESTS_LOCALE) ?? Locale.DEFAULT;

    /**
     * Size Thresholds
     */
    const sizeXxlThresholdLines = parseIntegerInput(getGithubActionInput(INPUT_KEYS.SIZE_XXL_THRESHOLD_LINES), 1000);
    const sizeXxlThresholdFiles = parseIntegerInput(getGithubActionInput(INPUT_KEYS.SIZE_XXL_THRESHOLD_FILES), 20);
    const sizeXxlThresholdCommits = parseIntegerInput(getGithubActionInput(INPUT_KEYS.SIZE_XXL_THRESHOLD_COMMITS), 10);
    const sizeXlThresholdLines = parseIntegerInput(getGithubActionInput(INPUT_KEYS.SIZE_XL_THRESHOLD_LINES), 500);
    const sizeXlThresholdFiles = parseIntegerInput(getGithubActionInput(INPUT_KEYS.SIZE_XL_THRESHOLD_FILES), 10);
    const sizeXlThresholdCommits = parseIntegerInput(getGithubActionInput(INPUT_KEYS.SIZE_XL_THRESHOLD_COMMITS), 5);
    const sizeLThresholdLines = parseIntegerInput(getGithubActionInput(INPUT_KEYS.SIZE_L_THRESHOLD_LINES), 250);
    const sizeLThresholdFiles = parseIntegerInput(getGithubActionInput(INPUT_KEYS.SIZE_L_THRESHOLD_FILES), 5);
    const sizeLThresholdCommits = parseIntegerInput(getGithubActionInput(INPUT_KEYS.SIZE_L_THRESHOLD_COMMITS), 3);
    const sizeMThresholdLines = parseIntegerInput(getGithubActionInput(INPUT_KEYS.SIZE_M_THRESHOLD_LINES), 100);
    const sizeMThresholdFiles = parseIntegerInput(getGithubActionInput(INPUT_KEYS.SIZE_M_THRESHOLD_FILES), 3);
    const sizeMThresholdCommits = parseIntegerInput(getGithubActionInput(INPUT_KEYS.SIZE_M_THRESHOLD_COMMITS), 2);
    const sizeSThresholdLines = parseIntegerInput(getGithubActionInput(INPUT_KEYS.SIZE_S_THRESHOLD_LINES), 50);
    const sizeSThresholdFiles = parseIntegerInput(getGithubActionInput(INPUT_KEYS.SIZE_S_THRESHOLD_FILES), 2);
    const sizeSThresholdCommits = parseIntegerInput(getGithubActionInput(INPUT_KEYS.SIZE_S_THRESHOLD_COMMITS), 1);
    const sizeXsThresholdLines = parseIntegerInput(getGithubActionInput(INPUT_KEYS.SIZE_XS_THRESHOLD_LINES), 25);
    const sizeXsThresholdFiles = parseIntegerInput(getGithubActionInput(INPUT_KEYS.SIZE_XS_THRESHOLD_FILES), 1);
    const sizeXsThresholdCommits = parseIntegerInput(getGithubActionInput(INPUT_KEYS.SIZE_XS_THRESHOLD_COMMITS), 1);
    
    /**
     * Branches
     */
    const mainBranch = getGithubActionInput(INPUT_KEYS.MAIN_BRANCH);
    const developmentBranch = getGithubActionInput(INPUT_KEYS.DEVELOPMENT_BRANCH);
    const featureTree = getGithubActionInput(INPUT_KEYS.FEATURE_TREE);
    const bugfixTree = getGithubActionInput(INPUT_KEYS.BUGFIX_TREE);
    const hotfixTree = getGithubActionInput(INPUT_KEYS.HOTFIX_TREE);
    const releaseTree = getGithubActionInput(INPUT_KEYS.RELEASE_TREE);
    const docsTree = getGithubActionInput(INPUT_KEYS.DOCS_TREE);
    const choreTree = getGithubActionInput(INPUT_KEYS.CHORE_TREE);

    /**
     * Prefix builder
     */
    let commitPrefixBuilder = getGithubActionInput(INPUT_KEYS.COMMIT_PREFIX_TRANSFORMS) ?? '';
    if (commitPrefixBuilder.length === 0) {
        commitPrefixBuilder = 'replace-slash';
    }

    /**
     * Issue
     */
    const branchManagementAlways = isEnabledInput(getGithubActionInput(INPUT_KEYS.BRANCH_MANAGEMENT_ALWAYS));
    const reopenIssueOnPush = isEnabledInput(getGithubActionInput(INPUT_KEYS.REOPEN_ISSUE_ON_PUSH));
    const issueDesiredAssigneesCount = parseIntegerInput(getGithubActionInput(INPUT_KEYS.DESIRED_ASSIGNEES_COUNT), 0);

    /**
     * Pull Request
     */
    const pullRequestDesiredAssigneesCount = parseIntegerInput(getGithubActionInput(INPUT_KEYS.PULL_REQUEST_DESIRED_ASSIGNEES_COUNT), 0);
    const pullRequestDesiredReviewersCount = parseIntegerInput(getGithubActionInput(INPUT_KEYS.PULL_REQUEST_DESIRED_REVIEWERS_COUNT), 0);
    const pullRequestMergeTimeout = parseIntegerInput(getGithubActionInput(INPUT_KEYS.PULL_REQUEST_MERGE_TIMEOUT), 0);

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
        issue: buildIssue(branchManagementAlways, reopenIssueOnPush, issueDesiredAssigneesCount, eventInputs),
        pullRequest: buildPullRequest(pullRequestDesiredAssigneesCount, pullRequestDesiredReviewersCount, pullRequestMergeTimeout, eventInputs),
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
        inputs: eventInputs,
    });

    logDebugInfo(`Execution built. Event will be resolved in mainRun. Single action: ${execution.singleAction.currentSingleAction ?? 'none'}, AI PR description: ${execution.ai.getAiPullRequestDescription()}, bugbot min severity: ${execution.ai.getBugbotMinSeverity()}.`);

    const results: Result[] = await mainRun(execution, projectBoard.command, new GitCliRepository());

    await finishGithubAction(
        execution,
        results,
        createIssueNotificationRepository(),
        createIssueContentCompositionRoot(),
    );
    } finally {
        if (managedOpencodeServer) {
            logInfo('Stopping OpenCode server...');
            await managedOpencodeServer.stop();
            logInfo('OpenCode server stopped.');
        }
    }
}

// Only auto-run when executed as the action entry (not when imported by tests)
if (typeof process.env.JEST_WORKER_ID === 'undefined') {
    runGitHubAction()
        .then(() => process.exit(0))
        .catch((err: unknown) => {
            logError(err);
            core.setFailed(err instanceof Error ? err.message : String(err));
            process.exit(1);
        });
}