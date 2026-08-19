import * as core from '@actions/core';
import * as github from '@actions/github';
import { Ai } from '../data/model/ai';



import { Hotfix } from '../data/model/hotfix';




import { Locale } from '../data/model/locale';

import { Release } from '../data/model/release';
import { Result } from '../data/model/result';
import { SingleAction } from '../data/model/single_action';


import { finishGithubAction } from './github_action_completion';
import { INPUT_KEYS } from '../utils/constants';
import { logDebugInfo, logError, logInfo } from '../utils/logger';
import type { ManagedAgentServer } from '../application/ports/agent_server_ports';
import { OpenCodeServerLifecycleAdapter } from '../data/repository/opencode_server_lifecycle_adapter';
import { GitCliRepository } from '../data/repository/git_cli_repository';
import { createIssueContentCompositionRoot } from '../infrastructure/composition/issue_content_composition_root';

import { createIssueNotificationRepository } from '../infrastructure/composition/issue_interaction_composition_root';
import { createProjectBoardCompositionRoot } from '../infrastructure/composition/project_board_composition_root';

import { loadProjectDetails } from './project_details_loader';
import { mainRun } from './common_action';
import { isEnabledInput } from './input_boolean_policy';
import { getGithubActionInput } from './github_action_input';
import { parseIntegerInput } from './input_number_policy';
import { parseDelimitedValues } from './input_values_policy';
import { readGithubActionAiInputs } from './github_action_ai_inputs';
import { buildImageConfiguration } from './image_configuration_builder';
import { buildSizeThresholds } from './size_threshold_builder';
import { readGithubActionThresholdInputs } from './github_action_threshold_inputs';
import { buildBranches } from './branches_builder';
import { readGithubActionBranchInputs } from './github_action_branch_inputs';
import { readGithubActionLabelInputs } from './github_action_label_inputs';
import { readGithubActionWorkflowInputs } from './github_action_workflow_inputs';
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
    const aiInputs = readGithubActionAiInputs(getGithubActionInput);
    let opencodeServerUrl = aiInputs.serverUrl;
    const opencodeModel = aiInputs.requestedAgentTasks.findings.model;
    const opencodeStartServer = aiInputs.startServer;

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
    const agentTasks = readGithubActionAiInputs((key) =>
        key === INPUT_KEYS.OPENCODE_SERVER_URL ? opencodeServerUrl : getGithubActionInput(key)
    ).requestedAgentTasks;


    try {
    const aiPullRequestDescription = aiInputs.pullRequestDescription;
    const aiMembersOnly = aiInputs.membersOnly;
    const aiIncludeReasoning = aiInputs.includeReasoning;
    const aiIgnoreFiles = aiInputs.ignoreFiles;
    const bugbotSeverity = aiInputs.bugbotSeverity;
    const bugbotCommentLimit = aiInputs.bugbotCommentLimit;
    const bugbotFixVerifyCommands = aiInputs.bugbotFixVerifyCommands;

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
    const workflowInputs = readGithubActionWorkflowInputs(getGithubActionInput);

    /**
     * Emoji-title
     */
    const titleEmoji = getGithubActionInput(INPUT_KEYS.EMOJI_LABELED_TITLE) === 'true';
    const branchManagementEmoji = getGithubActionInput(INPUT_KEYS.BRANCH_MANAGEMENT_EMOJI);

    const labelInputs = readGithubActionLabelInputs(getGithubActionInput);

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

    const sizeThresholdInputs = readGithubActionThresholdInputs(getGithubActionInput);
    const branchInputs = readGithubActionBranchInputs(getGithubActionInput);

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
        labels: buildLabels(labelInputs),
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
        sizeThresholds: buildSizeThresholds(sizeThresholdInputs),
        branches: buildBranches(branchInputs),
        release: new Release(),
        hotfix: new Hotfix(),
        workflows: buildWorkflows(workflowInputs.release, workflowInputs.hotfix),
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