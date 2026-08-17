import chalk from 'chalk';
import { Ai } from '../data/model/ai';


import { Execution } from '../data/model/execution';
import { Hotfix } from '../data/model/hotfix';




import { Locale } from '../data/model/locale';

import { Release } from '../data/model/release';
import { SingleAction } from '../data/model/single_action';


import { Welcome } from '../data/model/welcome';
import { BUGBOT_MAX_COMMENTS, BUGBOT_MIN_SEVERITY, INPUT_KEYS, TITLE } from '../utils/constants';
import { logInfo } from '../utils/logger';
import { RepositoryFactory } from '../infrastructure/composition/repository_factory';

import { getActionInputsWithDefaults } from '../utils/yml_utils';
import { isEnabledInput } from './input_boolean_policy';
import { resolveActionInput } from './action_input_source';
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
    const repositoryFactory = new RepositoryFactory();
    const projectRepository = repositoryFactory.createProjectBoardRepository();

    const actionInputs = getActionInputsWithDefaults();
    
    /**
     * Debug
     */
    const debug = isEnabledInput(resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.DEBUG));

    /**
     * Welcome
     */
    const welcomeTitle = resolveActionInput<string>(additionalParams, actionInputs, INPUT_KEYS.WELCOME_TITLE);
    const welcomeMessages = resolveActionInput<string[]>(additionalParams, actionInputs, INPUT_KEYS.WELCOME_MESSAGES);

    /**
     * Single action
     */
    const singleAction = resolveActionInput<string>(additionalParams, actionInputs, INPUT_KEYS.SINGLE_ACTION);
    const singleActionIssue = resolveActionInput<string>(additionalParams, actionInputs, INPUT_KEYS.SINGLE_ACTION_ISSUE);
    const singleActionVersion = resolveActionInput<string>(additionalParams, actionInputs, INPUT_KEYS.SINGLE_ACTION_VERSION);
    const singleActionTitle = resolveActionInput<string>(additionalParams, actionInputs, INPUT_KEYS.SINGLE_ACTION_TITLE);
    const singleActionChangelog = resolveActionInput<string>(additionalParams, actionInputs, INPUT_KEYS.SINGLE_ACTION_CHANGELOG);

    /**
     * Tokens
     */
    const token = resolveActionInput<string>(additionalParams, actionInputs, INPUT_KEYS.TOKEN);

    /**
     * AI (OpenCode)
     */
    const agentTasks = buildAgentTasksFromValues({ ...actionInputs, ...additionalParams });
    const opencodeServerUrl = agentTasks.findings.serverUrl ?? 'http://127.0.0.1:4096';
    const opencodeModel = agentTasks.findings.model ?? '';
    const aiPullRequestDescription = isEnabledInput(resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.AI_PULL_REQUEST_DESCRIPTION));
    const aiMembersOnly = isEnabledInput(resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.AI_MEMBERS_ONLY));
    const aiIncludeReasoning = isEnabledInput(resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.AI_INCLUDE_REASONING));
    const aiIgnoreFilesInput: string = resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.AI_IGNORE_FILES);
    const aiIgnoreFiles: string[] = parseDelimitedValues(aiIgnoreFilesInput);
    const bugbotSeverity = (resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.BUGBOT_SEVERITY)) || BUGBOT_MIN_SEVERITY;
    const bugbotCommentLimitRaw = resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.BUGBOT_COMMENT_LIMIT);
    const bugbotCommentLimit = parseBoundedPositiveIntegerInput(bugbotCommentLimitRaw, BUGBOT_MAX_COMMENTS, 200);
    const bugbotFixVerifyCommandsInput =
        resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.BUGBOT_FIX_VERIFY_COMMANDS) ?? '';
    const bugbotFixVerifyCommands = String(bugbotFixVerifyCommandsInput)
        .split(',')
        .map((c: string) => c.trim())
        .filter((c: string) => c.length > 0);

    /**
     * Projects Details
     */
    const projectIdsInput: string = resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.PROJECT_IDS);
    const projectIds: string[] = parseDelimitedValues(projectIdsInput);

    const projects = await loadProjectDetails(projectRepository, projectIds, token ?? '');

    const projectColumnIssueCreated = resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.PROJECT_COLUMN_ISSUE_CREATED)
    const projectColumnPullRequestCreated = resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.PROJECT_COLUMN_PULL_REQUEST_CREATED)
    const projectColumnIssueInProgress = resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.PROJECT_COLUMN_ISSUE_IN_PROGRESS)
    const projectColumnPullRequestInProgress = resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.PROJECT_COLUMN_PULL_REQUEST_IN_PROGRESS)

    /**
     * Images
     */
    const imageConfiguration = buildImageConfiguration(key => additionalParams[key] ?? actionInputs[key]);

    /**
     * Workflows
     */
    const releaseWorkflow = resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.RELEASE_WORKFLOW);
    const hotfixWorkflow = resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.HOTFIX_WORKFLOW);

    /**
     * Emoji-title
     */
    const titleEmoji = (resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.EMOJI_LABELED_TITLE)) === 'true';
    const branchManagementEmoji = resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.BRANCH_MANAGEMENT_EMOJI);

    /**
     * Labels
     */
    const branchManagementLauncherLabel = resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.BRANCH_MANAGEMENT_LAUNCHER_LABEL);
    const bugfixLabel = resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.BUGFIX_LABEL);
    const bugLabel = resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.BUG_LABEL);
    const hotfixLabel = resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.HOTFIX_LABEL);
    const enhancementLabel = resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.ENHANCEMENT_LABEL);
    const featureLabel = resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.FEATURE_LABEL);
    const releaseLabel = resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.RELEASE_LABEL);
    const questionLabel = resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.QUESTION_LABEL);
    const helpLabel = resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.HELP_LABEL);
    const deployLabel = resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.DEPLOY_LABEL);
    const deployedLabel = resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.DEPLOYED_LABEL);
    const docsLabel = resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.DOCS_LABEL);
    const documentationLabel = resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.DOCUMENTATION_LABEL);
    const choreLabel = resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.CHORE_LABEL);
    const maintenanceLabel = resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.MAINTENANCE_LABEL);
    const priorityHighLabel = resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.PRIORITY_HIGH_LABEL);
    const priorityMediumLabel = resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.PRIORITY_MEDIUM_LABEL);
    const priorityLowLabel = resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.PRIORITY_LOW_LABEL);
    const priorityNoneLabel = resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.PRIORITY_NONE_LABEL);
    const sizeXxlLabel = resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.SIZE_XXL_LABEL);
    const sizeXlLabel = resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.SIZE_XL_LABEL);
    const sizeLLabel = resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.SIZE_L_LABEL);
    const sizeMLabel = resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.SIZE_M_LABEL);
    const sizeSLabel = resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.SIZE_S_LABEL);
    const sizeXsLabel = resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.SIZE_XS_LABEL);

    /**
     * Issue Types
     */
    const issueTypeBug = resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.ISSUE_TYPE_BUG);
    const issueTypeBugDescription = resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.ISSUE_TYPE_BUG_DESCRIPTION);
    const issueTypeBugColor = resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.ISSUE_TYPE_BUG_COLOR);

    const issueTypeHotfix = resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.ISSUE_TYPE_HOTFIX);
    const issueTypeHotfixDescription = resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.ISSUE_TYPE_HOTFIX_DESCRIPTION);
    const issueTypeHotfixColor = resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.ISSUE_TYPE_HOTFIX_COLOR);

    const issueTypeFeature = resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.ISSUE_TYPE_FEATURE);
    const issueTypeFeatureDescription = resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.ISSUE_TYPE_FEATURE_DESCRIPTION);
    const issueTypeFeatureColor = resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.ISSUE_TYPE_FEATURE_COLOR);

    const issueTypeDocumentation = resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.ISSUE_TYPE_DOCUMENTATION);
    const issueTypeDocumentationDescription = resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.ISSUE_TYPE_DOCUMENTATION_DESCRIPTION);
    const issueTypeDocumentationColor = resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.ISSUE_TYPE_DOCUMENTATION_COLOR);

    const issueTypeMaintenance = resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.ISSUE_TYPE_MAINTENANCE);
    const issueTypeMaintenanceDescription = resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.ISSUE_TYPE_MAINTENANCE_DESCRIPTION);
    const issueTypeMaintenanceColor = resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.ISSUE_TYPE_MAINTENANCE_COLOR);

    const issueTypeRelease = resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.ISSUE_TYPE_RELEASE);
    const issueTypeReleaseDescription = resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.ISSUE_TYPE_RELEASE_DESCRIPTION);
    const issueTypeReleaseColor = resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.ISSUE_TYPE_RELEASE_COLOR);

    const issueTypeQuestion = resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.ISSUE_TYPE_QUESTION);
    const issueTypeQuestionDescription = resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.ISSUE_TYPE_QUESTION_DESCRIPTION);
    const issueTypeQuestionColor = resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.ISSUE_TYPE_QUESTION_COLOR);

    const issueTypeHelp = resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.ISSUE_TYPE_HELP);
    const issueTypeHelpDescription = resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.ISSUE_TYPE_HELP_DESCRIPTION);
    const issueTypeHelpColor = resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.ISSUE_TYPE_HELP_COLOR);

    const issueTypeTask = resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.ISSUE_TYPE_TASK);
    const issueTypeTaskDescription = resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.ISSUE_TYPE_TASK_DESCRIPTION);
    const issueTypeTaskColor = resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.ISSUE_TYPE_TASK_COLOR);

    /**
     * Locale
     */
    const issueLocale = resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.ISSUES_LOCALE) ?? Locale.DEFAULT;
    const pullRequestLocale = resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.PULL_REQUESTS_LOCALE) ?? Locale.DEFAULT;

    /**
     * Size Thresholds
     */
    const sizeXxlThresholdLines = parseIntegerInput(resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.SIZE_XXL_THRESHOLD_LINES), 1000);
    const sizeXxlThresholdFiles = parseIntegerInput(resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.SIZE_XXL_THRESHOLD_FILES), 20);
    const sizeXxlThresholdCommits = parseIntegerInput(resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.SIZE_XXL_THRESHOLD_COMMITS), 10);
    const sizeXlThresholdLines = parseIntegerInput(resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.SIZE_XL_THRESHOLD_LINES), 500);
    const sizeXlThresholdFiles = parseIntegerInput(resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.SIZE_XL_THRESHOLD_FILES), 10);
    const sizeXlThresholdCommits = parseIntegerInput(resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.SIZE_XL_THRESHOLD_COMMITS), 5);
    const sizeLThresholdLines = parseIntegerInput(resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.SIZE_L_THRESHOLD_LINES), 250);
    const sizeLThresholdFiles = parseIntegerInput(resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.SIZE_L_THRESHOLD_FILES), 5);
    const sizeLThresholdCommits = parseIntegerInput(resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.SIZE_L_THRESHOLD_COMMITS), 3);
    const sizeMThresholdLines = parseIntegerInput(resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.SIZE_M_THRESHOLD_LINES), 100);
    const sizeMThresholdFiles = parseIntegerInput(resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.SIZE_M_THRESHOLD_FILES), 3);
    const sizeMThresholdCommits = parseIntegerInput(resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.SIZE_M_THRESHOLD_COMMITS), 2);
    const sizeSThresholdLines = parseIntegerInput(resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.SIZE_S_THRESHOLD_LINES), 50);
    const sizeSThresholdFiles = parseIntegerInput(resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.SIZE_S_THRESHOLD_FILES), 2);
    const sizeSThresholdCommits = parseIntegerInput(resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.SIZE_S_THRESHOLD_COMMITS), 1);
    const sizeXsThresholdLines = parseIntegerInput(resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.SIZE_XS_THRESHOLD_LINES), 25);
    const sizeXsThresholdFiles = parseIntegerInput(resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.SIZE_XS_THRESHOLD_FILES), 1);
    const sizeXsThresholdCommits = parseIntegerInput(resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.SIZE_XS_THRESHOLD_COMMITS), 1);
    
    /**
     * Branches
     */
    const mainBranch = resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.MAIN_BRANCH);
    const developmentBranch = resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.DEVELOPMENT_BRANCH);
    const featureTree = resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.FEATURE_TREE);
    const bugfixTree = resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.BUGFIX_TREE);
    const hotfixTree = resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.HOTFIX_TREE);
    const releaseTree = resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.RELEASE_TREE);
    const docsTree = resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.DOCS_TREE);
    const choreTree = resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.CHORE_TREE);

    /**
     * Prefix builder
     */
    let commitPrefixBuilder = resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.COMMIT_PREFIX_TRANSFORMS) ?? '';
    if (commitPrefixBuilder.length === 0) {
        commitPrefixBuilder = 'replace-slash';
    }

    /**
     * Issue
     */
    const branchManagementAlways = isEnabledInput(resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.BRANCH_MANAGEMENT_ALWAYS));
    const reopenIssueOnPush = isEnabledInput(resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.REOPEN_ISSUE_ON_PUSH));
    const issueDesiredAssigneesCount = parseIntegerInput(resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.DESIRED_ASSIGNEES_COUNT), 0);

    /**
     * Pull Request
     */
    const pullRequestDesiredAssigneesCount = parseIntegerInput(resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.PULL_REQUEST_DESIRED_ASSIGNEES_COUNT), 0);
    const pullRequestDesiredReviewersCount = parseIntegerInput(resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.PULL_REQUEST_DESIRED_REVIEWERS_COUNT), 0);
    const pullRequestMergeTimeout = parseIntegerInput(resolveActionInput(additionalParams, actionInputs, INPUT_KEYS.PULL_REQUEST_MERGE_TIMEOUT), 0);

    const execution = new Execution(
        debug,
        new SingleAction(
            singleAction ?? '',
            singleActionIssue ?? '',
            singleActionVersion ?? '',
            singleActionTitle ?? '',
            singleActionChangelog ?? '',
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
        buildTokens(token ?? ''),
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
            defaultBranch: mainBranch,
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
        new Welcome(welcomeTitle ?? '', welcomeMessages ?? []),
        additionalParams,
    )

    const results = await mainRun(execution, projectRepository, repositoryFactory.createBranchRepository());

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
