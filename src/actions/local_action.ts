import chalk from 'chalk';
import { Ai } from '../data/model/ai';


import { Execution } from '../data/model/execution';
import { Hotfix } from '../data/model/hotfix';




import { Locale } from '../data/model/locale';

import { Release } from '../data/model/release';
import { SingleAction } from '../data/model/single_action';


import { Welcome } from '../data/model/welcome';
import { ProjectBoardRepository } from '../data/repository/project/project_board_repository';
import { BUGBOT_MAX_COMMENTS, BUGBOT_MIN_SEVERITY, INPUT_KEYS, TITLE } from '../utils/constants';
import { logInfo } from '../utils/logger';
import { getActionInputsWithDefaults } from '../utils/yml_utils';
import { isEnabledInput } from './input_boolean_policy';
import { loadProjectDetails } from './project_details_loader';
import { parseBoundedPositiveIntegerInput, parseIntegerInput } from './input_number_policy';
import { parseDelimitedValues } from './input_values_policy';
import { buildAgentTasksFromValues } from './agent_input_builder';
import { buildImageConfiguration } from './image_configuration_builder';
import { buildSizeThresholds } from './size_threshold_builder';
import { buildBranches } from './branches_builder';
import { buildEmoji, buildImages, buildIssue, buildIssueTypes, buildLabels, buildLocale, buildProjects, buildPullRequest, buildTokens, buildWorkflows } from './configuration_builders';
import { mainRun } from './common_action';
import boxen from 'boxen';

export async function runLocalAction(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Params shape is dynamic (CLI/action inputs)
    additionalParams: any
): Promise<void> {
    const projectRepository = new ProjectBoardRepository();

    const actionInputs = getActionInputsWithDefaults();
    
    /**
     * Debug
     */
    const debug = isEnabledInput(additionalParams[INPUT_KEYS.DEBUG] ?? actionInputs[INPUT_KEYS.DEBUG]);

    /**
     * Welcome
     */
    const welcomeTitle = additionalParams[INPUT_KEYS.WELCOME_TITLE] ?? actionInputs[INPUT_KEYS.WELCOME_TITLE];
    const welcomeMessages = additionalParams[INPUT_KEYS.WELCOME_MESSAGES] ?? actionInputs[INPUT_KEYS.WELCOME_MESSAGES];

    /**
     * Single action
     */
    const singleAction = additionalParams[INPUT_KEYS.SINGLE_ACTION] ?? actionInputs[INPUT_KEYS.SINGLE_ACTION];
    const singleActionIssue = additionalParams[INPUT_KEYS.SINGLE_ACTION_ISSUE] ?? actionInputs[INPUT_KEYS.SINGLE_ACTION_ISSUE];
    const singleActionVersion = additionalParams[INPUT_KEYS.SINGLE_ACTION_VERSION] ?? actionInputs[INPUT_KEYS.SINGLE_ACTION_VERSION];
    const singleActionTitle = additionalParams[INPUT_KEYS.SINGLE_ACTION_TITLE] ?? actionInputs[INPUT_KEYS.SINGLE_ACTION_TITLE];
    const singleActionChangelog = additionalParams[INPUT_KEYS.SINGLE_ACTION_CHANGELOG] ?? actionInputs[INPUT_KEYS.SINGLE_ACTION_CHANGELOG];

    /**
     * Tokens
     */
    const token = additionalParams[INPUT_KEYS.TOKEN] ?? actionInputs[INPUT_KEYS.TOKEN];

    /**
     * AI (OpenCode)
     */
    const agentTasks = buildAgentTasksFromValues({ ...actionInputs, ...additionalParams });
    const opencodeServerUrl = agentTasks.findings.serverUrl ?? 'http://127.0.0.1:4096';
    const opencodeModel = agentTasks.findings.model ?? '';
    const aiPullRequestDescription = isEnabledInput(additionalParams[INPUT_KEYS.AI_PULL_REQUEST_DESCRIPTION] ?? actionInputs[INPUT_KEYS.AI_PULL_REQUEST_DESCRIPTION]);
    const aiMembersOnly = isEnabledInput(additionalParams[INPUT_KEYS.AI_MEMBERS_ONLY] ?? actionInputs[INPUT_KEYS.AI_MEMBERS_ONLY]);
    const aiIncludeReasoning = isEnabledInput(additionalParams[INPUT_KEYS.AI_INCLUDE_REASONING] ?? actionInputs[INPUT_KEYS.AI_INCLUDE_REASONING]);
    const aiIgnoreFilesInput: string = additionalParams[INPUT_KEYS.AI_IGNORE_FILES] ?? actionInputs[INPUT_KEYS.AI_IGNORE_FILES];
    const aiIgnoreFiles: string[] = parseDelimitedValues(aiIgnoreFilesInput);
    const bugbotSeverity = (additionalParams[INPUT_KEYS.BUGBOT_SEVERITY] ?? actionInputs[INPUT_KEYS.BUGBOT_SEVERITY]) || BUGBOT_MIN_SEVERITY;
    const bugbotCommentLimitRaw = additionalParams[INPUT_KEYS.BUGBOT_COMMENT_LIMIT] ?? actionInputs[INPUT_KEYS.BUGBOT_COMMENT_LIMIT];
    const bugbotCommentLimit = parseBoundedPositiveIntegerInput(bugbotCommentLimitRaw, BUGBOT_MAX_COMMENTS, 200);
    const bugbotFixVerifyCommandsInput =
        additionalParams[INPUT_KEYS.BUGBOT_FIX_VERIFY_COMMANDS] ?? actionInputs[INPUT_KEYS.BUGBOT_FIX_VERIFY_COMMANDS] ?? '';
    const bugbotFixVerifyCommands = String(bugbotFixVerifyCommandsInput)
        .split(',')
        .map((c: string) => c.trim())
        .filter((c: string) => c.length > 0);

    /**
     * Projects Details
     */
    const projectIdsInput: string = additionalParams[INPUT_KEYS.PROJECT_IDS] ?? actionInputs[INPUT_KEYS.PROJECT_IDS];
    const projectIds: string[] = parseDelimitedValues(projectIdsInput);

    const projects = await loadProjectDetails(projectRepository, projectIds, token);

    const projectColumnIssueCreated = additionalParams[INPUT_KEYS.PROJECT_COLUMN_ISSUE_CREATED] ?? actionInputs[INPUT_KEYS.PROJECT_COLUMN_ISSUE_CREATED]
    const projectColumnPullRequestCreated = additionalParams[INPUT_KEYS.PROJECT_COLUMN_PULL_REQUEST_CREATED] ?? actionInputs[INPUT_KEYS.PROJECT_COLUMN_PULL_REQUEST_CREATED]
    const projectColumnIssueInProgress = additionalParams[INPUT_KEYS.PROJECT_COLUMN_ISSUE_IN_PROGRESS] ?? actionInputs[INPUT_KEYS.PROJECT_COLUMN_ISSUE_IN_PROGRESS]
    const projectColumnPullRequestInProgress = additionalParams[INPUT_KEYS.PROJECT_COLUMN_PULL_REQUEST_IN_PROGRESS] ?? actionInputs[INPUT_KEYS.PROJECT_COLUMN_PULL_REQUEST_IN_PROGRESS]

    /**
     * Images
     */
    const imageConfiguration = buildImageConfiguration(key => additionalParams[key] ?? actionInputs[key]);

    /**
     * Workflows
     */
    const releaseWorkflow = additionalParams[INPUT_KEYS.RELEASE_WORKFLOW] ?? actionInputs[INPUT_KEYS.RELEASE_WORKFLOW];
    const hotfixWorkflow = additionalParams[INPUT_KEYS.HOTFIX_WORKFLOW] ?? actionInputs[INPUT_KEYS.HOTFIX_WORKFLOW];

    /**
     * Emoji-title
     */
    const titleEmoji = (additionalParams[INPUT_KEYS.EMOJI_LABELED_TITLE] ?? actionInputs[INPUT_KEYS.EMOJI_LABELED_TITLE]) === 'true';
    const branchManagementEmoji = additionalParams[INPUT_KEYS.BRANCH_MANAGEMENT_EMOJI] ?? actionInputs[INPUT_KEYS.BRANCH_MANAGEMENT_EMOJI];

    /**
     * Labels
     */
    const branchManagementLauncherLabel = additionalParams[INPUT_KEYS.BRANCH_MANAGEMENT_LAUNCHER_LABEL] ?? actionInputs[INPUT_KEYS.BRANCH_MANAGEMENT_LAUNCHER_LABEL];
    const bugfixLabel = additionalParams[INPUT_KEYS.BUGFIX_LABEL] ?? actionInputs[INPUT_KEYS.BUGFIX_LABEL];
    const bugLabel = additionalParams[INPUT_KEYS.BUG_LABEL] ?? actionInputs[INPUT_KEYS.BUG_LABEL];
    const hotfixLabel = additionalParams[INPUT_KEYS.HOTFIX_LABEL] ?? actionInputs[INPUT_KEYS.HOTFIX_LABEL];
    const enhancementLabel = additionalParams[INPUT_KEYS.ENHANCEMENT_LABEL] ?? actionInputs[INPUT_KEYS.ENHANCEMENT_LABEL];
    const featureLabel = additionalParams[INPUT_KEYS.FEATURE_LABEL] ?? actionInputs[INPUT_KEYS.FEATURE_LABEL];
    const releaseLabel = additionalParams[INPUT_KEYS.RELEASE_LABEL] ?? actionInputs[INPUT_KEYS.RELEASE_LABEL];
    const questionLabel = additionalParams[INPUT_KEYS.QUESTION_LABEL] ?? actionInputs[INPUT_KEYS.QUESTION_LABEL];
    const helpLabel = additionalParams[INPUT_KEYS.HELP_LABEL] ?? actionInputs[INPUT_KEYS.HELP_LABEL];
    const deployLabel = additionalParams[INPUT_KEYS.DEPLOY_LABEL] ?? actionInputs[INPUT_KEYS.DEPLOY_LABEL];
    const deployedLabel = additionalParams[INPUT_KEYS.DEPLOYED_LABEL] ?? actionInputs[INPUT_KEYS.DEPLOYED_LABEL];
    const docsLabel = additionalParams[INPUT_KEYS.DOCS_LABEL] ?? actionInputs[INPUT_KEYS.DOCS_LABEL];
    const documentationLabel = additionalParams[INPUT_KEYS.DOCUMENTATION_LABEL] ?? actionInputs[INPUT_KEYS.DOCUMENTATION_LABEL];
    const choreLabel = additionalParams[INPUT_KEYS.CHORE_LABEL] ?? actionInputs[INPUT_KEYS.CHORE_LABEL];
    const maintenanceLabel = additionalParams[INPUT_KEYS.MAINTENANCE_LABEL] ?? actionInputs[INPUT_KEYS.MAINTENANCE_LABEL];
    const priorityHighLabel = additionalParams[INPUT_KEYS.PRIORITY_HIGH_LABEL] ?? actionInputs[INPUT_KEYS.PRIORITY_HIGH_LABEL];
    const priorityMediumLabel = additionalParams[INPUT_KEYS.PRIORITY_MEDIUM_LABEL] ?? actionInputs[INPUT_KEYS.PRIORITY_MEDIUM_LABEL];
    const priorityLowLabel = additionalParams[INPUT_KEYS.PRIORITY_LOW_LABEL] ?? actionInputs[INPUT_KEYS.PRIORITY_LOW_LABEL];
    const priorityNoneLabel = additionalParams[INPUT_KEYS.PRIORITY_NONE_LABEL] ?? actionInputs[INPUT_KEYS.PRIORITY_NONE_LABEL];
    const sizeXxlLabel = additionalParams[INPUT_KEYS.SIZE_XXL_LABEL] ?? actionInputs[INPUT_KEYS.SIZE_XXL_LABEL];
    const sizeXlLabel = additionalParams[INPUT_KEYS.SIZE_XL_LABEL] ?? actionInputs[INPUT_KEYS.SIZE_XL_LABEL];
    const sizeLLabel = additionalParams[INPUT_KEYS.SIZE_L_LABEL] ?? actionInputs[INPUT_KEYS.SIZE_L_LABEL];
    const sizeMLabel = additionalParams[INPUT_KEYS.SIZE_M_LABEL] ?? actionInputs[INPUT_KEYS.SIZE_M_LABEL];
    const sizeSLabel = additionalParams[INPUT_KEYS.SIZE_S_LABEL] ?? actionInputs[INPUT_KEYS.SIZE_S_LABEL];
    const sizeXsLabel = additionalParams[INPUT_KEYS.SIZE_XS_LABEL] ?? actionInputs[INPUT_KEYS.SIZE_XS_LABEL];

    /**
     * Issue Types
     */
    const issueTypeBug = additionalParams[INPUT_KEYS.ISSUE_TYPE_BUG] ?? actionInputs[INPUT_KEYS.ISSUE_TYPE_BUG];
    const issueTypeBugDescription = additionalParams[INPUT_KEYS.ISSUE_TYPE_BUG_DESCRIPTION] ?? actionInputs[INPUT_KEYS.ISSUE_TYPE_BUG_DESCRIPTION];
    const issueTypeBugColor = additionalParams[INPUT_KEYS.ISSUE_TYPE_BUG_COLOR] ?? actionInputs[INPUT_KEYS.ISSUE_TYPE_BUG_COLOR];

    const issueTypeHotfix = additionalParams[INPUT_KEYS.ISSUE_TYPE_HOTFIX] ?? actionInputs[INPUT_KEYS.ISSUE_TYPE_HOTFIX];
    const issueTypeHotfixDescription = additionalParams[INPUT_KEYS.ISSUE_TYPE_HOTFIX_DESCRIPTION] ?? actionInputs[INPUT_KEYS.ISSUE_TYPE_HOTFIX_DESCRIPTION];
    const issueTypeHotfixColor = additionalParams[INPUT_KEYS.ISSUE_TYPE_HOTFIX_COLOR] ?? actionInputs[INPUT_KEYS.ISSUE_TYPE_HOTFIX_COLOR];

    const issueTypeFeature = additionalParams[INPUT_KEYS.ISSUE_TYPE_FEATURE] ?? actionInputs[INPUT_KEYS.ISSUE_TYPE_FEATURE];
    const issueTypeFeatureDescription = additionalParams[INPUT_KEYS.ISSUE_TYPE_FEATURE_DESCRIPTION] ?? actionInputs[INPUT_KEYS.ISSUE_TYPE_FEATURE_DESCRIPTION];
    const issueTypeFeatureColor = additionalParams[INPUT_KEYS.ISSUE_TYPE_FEATURE_COLOR] ?? actionInputs[INPUT_KEYS.ISSUE_TYPE_FEATURE_COLOR];

    const issueTypeDocumentation = additionalParams[INPUT_KEYS.ISSUE_TYPE_DOCUMENTATION] ?? actionInputs[INPUT_KEYS.ISSUE_TYPE_DOCUMENTATION];
    const issueTypeDocumentationDescription = additionalParams[INPUT_KEYS.ISSUE_TYPE_DOCUMENTATION_DESCRIPTION] ?? actionInputs[INPUT_KEYS.ISSUE_TYPE_DOCUMENTATION_DESCRIPTION];
    const issueTypeDocumentationColor = additionalParams[INPUT_KEYS.ISSUE_TYPE_DOCUMENTATION_COLOR] ?? actionInputs[INPUT_KEYS.ISSUE_TYPE_DOCUMENTATION_COLOR];

    const issueTypeMaintenance = additionalParams[INPUT_KEYS.ISSUE_TYPE_MAINTENANCE] ?? actionInputs[INPUT_KEYS.ISSUE_TYPE_MAINTENANCE];
    const issueTypeMaintenanceDescription = additionalParams[INPUT_KEYS.ISSUE_TYPE_MAINTENANCE_DESCRIPTION] ?? actionInputs[INPUT_KEYS.ISSUE_TYPE_MAINTENANCE_DESCRIPTION];
    const issueTypeMaintenanceColor = additionalParams[INPUT_KEYS.ISSUE_TYPE_MAINTENANCE_COLOR] ?? actionInputs[INPUT_KEYS.ISSUE_TYPE_MAINTENANCE_COLOR];

    const issueTypeRelease = additionalParams[INPUT_KEYS.ISSUE_TYPE_RELEASE] ?? actionInputs[INPUT_KEYS.ISSUE_TYPE_RELEASE];
    const issueTypeReleaseDescription = additionalParams[INPUT_KEYS.ISSUE_TYPE_RELEASE_DESCRIPTION] ?? actionInputs[INPUT_KEYS.ISSUE_TYPE_RELEASE_DESCRIPTION];
    const issueTypeReleaseColor = additionalParams[INPUT_KEYS.ISSUE_TYPE_RELEASE_COLOR] ?? actionInputs[INPUT_KEYS.ISSUE_TYPE_RELEASE_COLOR];

    const issueTypeQuestion = additionalParams[INPUT_KEYS.ISSUE_TYPE_QUESTION] ?? actionInputs[INPUT_KEYS.ISSUE_TYPE_QUESTION];
    const issueTypeQuestionDescription = additionalParams[INPUT_KEYS.ISSUE_TYPE_QUESTION_DESCRIPTION] ?? actionInputs[INPUT_KEYS.ISSUE_TYPE_QUESTION_DESCRIPTION];
    const issueTypeQuestionColor = additionalParams[INPUT_KEYS.ISSUE_TYPE_QUESTION_COLOR] ?? actionInputs[INPUT_KEYS.ISSUE_TYPE_QUESTION_COLOR];

    const issueTypeHelp = additionalParams[INPUT_KEYS.ISSUE_TYPE_HELP] ?? actionInputs[INPUT_KEYS.ISSUE_TYPE_HELP];
    const issueTypeHelpDescription = additionalParams[INPUT_KEYS.ISSUE_TYPE_HELP_DESCRIPTION] ?? actionInputs[INPUT_KEYS.ISSUE_TYPE_HELP_DESCRIPTION];
    const issueTypeHelpColor = additionalParams[INPUT_KEYS.ISSUE_TYPE_HELP_COLOR] ?? actionInputs[INPUT_KEYS.ISSUE_TYPE_HELP_COLOR];

    const issueTypeTask = additionalParams[INPUT_KEYS.ISSUE_TYPE_TASK] ?? actionInputs[INPUT_KEYS.ISSUE_TYPE_TASK];
    const issueTypeTaskDescription = additionalParams[INPUT_KEYS.ISSUE_TYPE_TASK_DESCRIPTION] ?? actionInputs[INPUT_KEYS.ISSUE_TYPE_TASK_DESCRIPTION];
    const issueTypeTaskColor = additionalParams[INPUT_KEYS.ISSUE_TYPE_TASK_COLOR] ?? actionInputs[INPUT_KEYS.ISSUE_TYPE_TASK_COLOR];

    /**
     * Locale
     */
    const issueLocale = additionalParams[INPUT_KEYS.ISSUES_LOCALE] ?? actionInputs[INPUT_KEYS.ISSUES_LOCALE] ?? Locale.DEFAULT;
    const pullRequestLocale = additionalParams[INPUT_KEYS.PULL_REQUESTS_LOCALE] ?? actionInputs[INPUT_KEYS.PULL_REQUESTS_LOCALE] ?? Locale.DEFAULT;

    /**
     * Size Thresholds
     */
    const sizeXxlThresholdLines = parseIntegerInput(additionalParams[INPUT_KEYS.SIZE_XXL_THRESHOLD_LINES] ?? actionInputs[INPUT_KEYS.SIZE_XXL_THRESHOLD_LINES], 1000);
    const sizeXxlThresholdFiles = parseIntegerInput(additionalParams[INPUT_KEYS.SIZE_XXL_THRESHOLD_FILES] ?? actionInputs[INPUT_KEYS.SIZE_XXL_THRESHOLD_FILES], 20);
    const sizeXxlThresholdCommits = parseIntegerInput(additionalParams[INPUT_KEYS.SIZE_XXL_THRESHOLD_COMMITS] ?? actionInputs[INPUT_KEYS.SIZE_XXL_THRESHOLD_COMMITS], 10);
    const sizeXlThresholdLines = parseIntegerInput(additionalParams[INPUT_KEYS.SIZE_XL_THRESHOLD_LINES] ?? actionInputs[INPUT_KEYS.SIZE_XL_THRESHOLD_LINES], 500);
    const sizeXlThresholdFiles = parseIntegerInput(additionalParams[INPUT_KEYS.SIZE_XL_THRESHOLD_FILES] ?? actionInputs[INPUT_KEYS.SIZE_XL_THRESHOLD_FILES], 10);
    const sizeXlThresholdCommits = parseIntegerInput(additionalParams[INPUT_KEYS.SIZE_XL_THRESHOLD_COMMITS] ?? actionInputs[INPUT_KEYS.SIZE_XL_THRESHOLD_COMMITS], 5);
    const sizeLThresholdLines = parseIntegerInput(additionalParams[INPUT_KEYS.SIZE_L_THRESHOLD_LINES] ?? actionInputs[INPUT_KEYS.SIZE_L_THRESHOLD_LINES], 250);
    const sizeLThresholdFiles = parseIntegerInput(additionalParams[INPUT_KEYS.SIZE_L_THRESHOLD_FILES] ?? actionInputs[INPUT_KEYS.SIZE_L_THRESHOLD_FILES], 5);
    const sizeLThresholdCommits = parseIntegerInput(additionalParams[INPUT_KEYS.SIZE_L_THRESHOLD_COMMITS] ?? actionInputs[INPUT_KEYS.SIZE_L_THRESHOLD_COMMITS], 3);
    const sizeMThresholdLines = parseIntegerInput(additionalParams[INPUT_KEYS.SIZE_M_THRESHOLD_LINES] ?? actionInputs[INPUT_KEYS.SIZE_M_THRESHOLD_LINES], 100);
    const sizeMThresholdFiles = parseIntegerInput(additionalParams[INPUT_KEYS.SIZE_M_THRESHOLD_FILES] ?? actionInputs[INPUT_KEYS.SIZE_M_THRESHOLD_FILES], 3);
    const sizeMThresholdCommits = parseIntegerInput(additionalParams[INPUT_KEYS.SIZE_M_THRESHOLD_COMMITS] ?? actionInputs[INPUT_KEYS.SIZE_M_THRESHOLD_COMMITS], 2);
    const sizeSThresholdLines = parseIntegerInput(additionalParams[INPUT_KEYS.SIZE_S_THRESHOLD_LINES] ?? actionInputs[INPUT_KEYS.SIZE_S_THRESHOLD_LINES], 50);
    const sizeSThresholdFiles = parseIntegerInput(additionalParams[INPUT_KEYS.SIZE_S_THRESHOLD_FILES] ?? actionInputs[INPUT_KEYS.SIZE_S_THRESHOLD_FILES], 2);
    const sizeSThresholdCommits = parseIntegerInput(additionalParams[INPUT_KEYS.SIZE_S_THRESHOLD_COMMITS] ?? actionInputs[INPUT_KEYS.SIZE_S_THRESHOLD_COMMITS], 1);
    const sizeXsThresholdLines = parseIntegerInput(additionalParams[INPUT_KEYS.SIZE_XS_THRESHOLD_LINES] ?? actionInputs[INPUT_KEYS.SIZE_XS_THRESHOLD_LINES], 25);
    const sizeXsThresholdFiles = parseIntegerInput(additionalParams[INPUT_KEYS.SIZE_XS_THRESHOLD_FILES] ?? actionInputs[INPUT_KEYS.SIZE_XS_THRESHOLD_FILES], 1);
    const sizeXsThresholdCommits = parseIntegerInput(additionalParams[INPUT_KEYS.SIZE_XS_THRESHOLD_COMMITS] ?? actionInputs[INPUT_KEYS.SIZE_XS_THRESHOLD_COMMITS], 1);
    
    /**
     * Branches
     */
    const mainBranch = additionalParams[INPUT_KEYS.MAIN_BRANCH] ?? actionInputs[INPUT_KEYS.MAIN_BRANCH];
    const developmentBranch = additionalParams[INPUT_KEYS.DEVELOPMENT_BRANCH] ?? actionInputs[INPUT_KEYS.DEVELOPMENT_BRANCH];
    const featureTree = additionalParams[INPUT_KEYS.FEATURE_TREE] ?? actionInputs[INPUT_KEYS.FEATURE_TREE];
    const bugfixTree = additionalParams[INPUT_KEYS.BUGFIX_TREE] ?? actionInputs[INPUT_KEYS.BUGFIX_TREE];
    const hotfixTree = additionalParams[INPUT_KEYS.HOTFIX_TREE] ?? actionInputs[INPUT_KEYS.HOTFIX_TREE];
    const releaseTree = additionalParams[INPUT_KEYS.RELEASE_TREE] ?? actionInputs[INPUT_KEYS.RELEASE_TREE];
    const docsTree = additionalParams[INPUT_KEYS.DOCS_TREE] ?? actionInputs[INPUT_KEYS.DOCS_TREE];
    const choreTree = additionalParams[INPUT_KEYS.CHORE_TREE] ?? actionInputs[INPUT_KEYS.CHORE_TREE];

    /**
     * Prefix builder
     */
    let commitPrefixBuilder = additionalParams[INPUT_KEYS.COMMIT_PREFIX_TRANSFORMS] ?? actionInputs[INPUT_KEYS.COMMIT_PREFIX_TRANSFORMS] ?? '';
    if (commitPrefixBuilder.length === 0) {
        commitPrefixBuilder = 'replace-slash';
    }

    /**
     * Issue
     */
    const branchManagementAlways = isEnabledInput(additionalParams[INPUT_KEYS.BRANCH_MANAGEMENT_ALWAYS] ?? actionInputs[INPUT_KEYS.BRANCH_MANAGEMENT_ALWAYS]);
    const reopenIssueOnPush = isEnabledInput(additionalParams[INPUT_KEYS.REOPEN_ISSUE_ON_PUSH] ?? actionInputs[INPUT_KEYS.REOPEN_ISSUE_ON_PUSH]);
    const issueDesiredAssigneesCount = parseIntegerInput(additionalParams[INPUT_KEYS.DESIRED_ASSIGNEES_COUNT] ?? actionInputs[INPUT_KEYS.DESIRED_ASSIGNEES_COUNT], 0);

    /**
     * Pull Request
     */
    const pullRequestDesiredAssigneesCount = parseIntegerInput(additionalParams[INPUT_KEYS.PULL_REQUEST_DESIRED_ASSIGNEES_COUNT] ?? actionInputs[INPUT_KEYS.PULL_REQUEST_DESIRED_ASSIGNEES_COUNT], 0);
    const pullRequestDesiredReviewersCount = parseIntegerInput(additionalParams[INPUT_KEYS.PULL_REQUEST_DESIRED_REVIEWERS_COUNT] ?? actionInputs[INPUT_KEYS.PULL_REQUEST_DESIRED_REVIEWERS_COUNT], 0);
    const pullRequestMergeTimeout = parseIntegerInput(additionalParams[INPUT_KEYS.PULL_REQUEST_MERGE_TIMEOUT] ?? actionInputs[INPUT_KEYS.PULL_REQUEST_MERGE_TIMEOUT], 0);

    const execution = new Execution(
        debug,
        new SingleAction(
            singleAction,
            singleActionIssue,
            singleActionVersion,
            singleActionTitle,
            singleActionChangelog,
        ),
        commitPrefixBuilder,
        buildIssue(branchManagementAlways, reopenIssueOnPush, issueDesiredAssigneesCount, additionalParams),
        buildPullRequest(pullRequestDesiredAssigneesCount, pullRequestDesiredReviewersCount, pullRequestMergeTimeout, additionalParams),
        buildEmoji(titleEmoji, branchManagementEmoji),
        buildImages({
            onIssue: imageConfiguration.onIssue,
            onPullRequest: imageConfiguration.onPullRequest,
            onCommit: imageConfiguration.onCommit,
            issue: imageConfiguration.issue,
            pullRequest: imageConfiguration.pullRequest,
            commit: imageConfiguration.commit,
        }),
        buildTokens(token),
        new Ai(
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
        buildLabels({
            branching: { launcher: branchManagementLauncherLabel },
            workflow: { bug: bugLabel, bugfix: bugfixLabel, hotfix: hotfixLabel, enhancement: enhancementLabel, feature: featureLabel, release: releaseLabel, question: questionLabel, help: helpLabel, deploy: deployLabel, deployed: deployedLabel, docs: docsLabel, documentation: documentationLabel, chore: choreLabel, maintenance: maintenanceLabel },
            priorities: { high: priorityHighLabel, medium: priorityMediumLabel, low: priorityLowLabel, none: priorityNoneLabel },
            sizes: { xxl: sizeXxlLabel, xl: sizeXlLabel, l: sizeLLabel, m: sizeMLabel, s: sizeSLabel, xs: sizeXsLabel },
        }),
        buildIssueTypes({
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
        buildLocale(issueLocale, pullRequestLocale),
        buildSizeThresholds({
            xxl: { lines: sizeXxlThresholdLines, files: sizeXxlThresholdFiles, commits: sizeXxlThresholdCommits },
            xl: { lines: sizeXlThresholdLines, files: sizeXlThresholdFiles, commits: sizeXlThresholdCommits },
            l: { lines: sizeLThresholdLines, files: sizeLThresholdFiles, commits: sizeLThresholdCommits },
            m: { lines: sizeMThresholdLines, files: sizeMThresholdFiles, commits: sizeMThresholdCommits },
            s: { lines: sizeSThresholdLines, files: sizeSThresholdFiles, commits: sizeSThresholdCommits },
            xs: { lines: sizeXsThresholdLines, files: sizeXsThresholdFiles, commits: sizeXsThresholdCommits },
        }),
        buildBranches({
            main: mainBranch,
            development: developmentBranch,
            featureTree,
            bugfixTree,
            hotfixTree,
            releaseTree,
            docsTree,
            choreTree,
        }),
        new Release(),
        new Hotfix(),
        buildWorkflows(releaseWorkflow, hotfixWorkflow),
        buildProjects({
            projects,
            issueCreated: projectColumnIssueCreated,
            pullRequestCreated: projectColumnPullRequestCreated,
            issueInProgress: projectColumnIssueInProgress,
            pullRequestInProgress: projectColumnPullRequestInProgress,
        }),
        new Welcome(welcomeTitle, welcomeMessages),
        additionalParams,
    )

    const results = await mainRun(execution);

    let content = ''
    const stepsContent = results
        .filter(result => result.executed && result.steps.length > 0)
        .map(result => chalk.gray(result.steps.join('\n'))).join('\n')

    if (stepsContent.length > 0) {
        content +=  '\n' + chalk.cyan('Steps:') + '\n' + stepsContent
    }

    const errorsContent = results
        .filter(result => !result.executed && result.errors.length > 0)
        .map(result => chalk.gray(result.errors.join('\n'))).join('\n')

    if (errorsContent.length > 0) {
        content +=  '\n' + chalk.red('Errors:') + '\n' + errorsContent
    }

    const reminderContent = results
        .filter(result => result.executed && result.reminders.length > 0)
        .map(result => chalk.gray(result.reminders.join('\n'))).join('\n')

    if (reminderContent.length > 0) {
        content +=  '\n' + chalk.cyan('Reminder:') + '\n' + reminderContent
    }

    logInfo('\n')
    logInfo(
        boxen(
            content,
            {
                padding: 1,
                margin: 1,
                borderStyle: 'round',
                borderColor: 'cyan',
                title: TITLE,
                titleAlignment: 'center'
            }
        )
    );
}
