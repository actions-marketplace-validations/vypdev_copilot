import * as core from '@actions/core';
import { Ai } from '../data/model/ai';


import { Execution } from '../data/model/execution';
import { Hotfix } from '../data/model/hotfix';




import { Locale } from '../data/model/locale';

import { Release } from '../data/model/release';
import { Result } from '../data/model/result';
import { SingleAction } from '../data/model/single_action';


import { ProjectRepository } from '../data/repository/project_repository';
import { PublishResultUseCase } from '../usecase/steps/common/publish_resume_use_case';
import { StoreConfigurationUseCase } from '../usecase/steps/common/store_configuration_use_case';
import { BUGBOT_MAX_COMMENTS, BUGBOT_MIN_SEVERITY, DEFAULT_IMAGE_CONFIG, INPUT_KEYS, OPENCODE_DEFAULT_MODEL } from '../utils/constants';
import { logDebugInfo, logError, logInfo } from '../utils/logger';
import { startOpencodeServer, type ManagedOpencodeServer } from '../utils/opencode_server';
import { loadProjectDetails } from './project_details_loader';
import { mainRun } from './common_action';
import { isEnabledInput } from './input_boolean_policy';
import { parseBoundedPositiveIntegerInput, parseIntegerInput } from './input_number_policy';
import { parseDelimitedValues } from './input_values_policy';
import { buildSizeThresholds } from './size_threshold_builder';
import { buildBranches } from './branches_builder';
import { buildEmoji, buildImages, buildIssue, buildIssueTypes, buildLabels, buildLocale, buildProjects, buildPullRequest, buildTokens, buildWorkflows } from './configuration_builders';

export async function runGitHubAction(): Promise<void> {
    const projectRepository = new ProjectRepository();

    logInfo('GitHub Action: runGitHubAction started.');

    /**
     * Debug
     */
    const debug = isEnabledInput(getInput(INPUT_KEYS.DEBUG));
    if (debug) {
        logInfo('Debug mode is enabled. Full logs will be included in the report.');
    }

    /**
     * Single action
     */
    const singleAction = getInput(INPUT_KEYS.SINGLE_ACTION);
    const singleActionIssue = getInput(INPUT_KEYS.SINGLE_ACTION_ISSUE);
    const singleActionVersion = getInput(INPUT_KEYS.SINGLE_ACTION_VERSION);
    const singleActionTitle = getInput(INPUT_KEYS.SINGLE_ACTION_TITLE);
    const singleActionChangelog = getInput(INPUT_KEYS.SINGLE_ACTION_CHANGELOG);

    /**
     * Tokens
     */
    const token = getInput(INPUT_KEYS.TOKEN, {required: true});

    /**
     * AI (OpenCode)
     */
    let opencodeServerUrl = getInput(INPUT_KEYS.OPENCODE_SERVER_URL) || 'http://127.0.0.1:4096';
    const opencodeModel = getInput(INPUT_KEYS.OPENCODE_MODEL) || OPENCODE_DEFAULT_MODEL;
    const opencodeStartServer = isEnabledInput(getInput(INPUT_KEYS.OPENCODE_START_SERVER));

    let managedOpencodeServer: ManagedOpencodeServer | undefined;
    if (opencodeStartServer) {
        logInfo('Starting managed OpenCode server...');
        managedOpencodeServer = await startOpencodeServer({ cwd: process.cwd() });
        opencodeServerUrl = managedOpencodeServer.url;
        logInfo(`OpenCode server started at ${opencodeServerUrl}.`);
    } else {
        logDebugInfo(`Using OpenCode server URL: ${opencodeServerUrl}, model: ${opencodeModel}.`);
    }

    try {
    const aiPullRequestDescription = isEnabledInput(getInput(INPUT_KEYS.AI_PULL_REQUEST_DESCRIPTION));
    const aiMembersOnly = isEnabledInput(getInput(INPUT_KEYS.AI_MEMBERS_ONLY));
    const aiIncludeReasoning = isEnabledInput(getInput(INPUT_KEYS.AI_INCLUDE_REASONING));
    const aiIgnoreFilesInput: string = getInput(INPUT_KEYS.AI_IGNORE_FILES);
    const aiIgnoreFiles: string[] = parseDelimitedValues(aiIgnoreFilesInput);
    const bugbotSeverity = getInput(INPUT_KEYS.BUGBOT_SEVERITY) || BUGBOT_MIN_SEVERITY;
    const bugbotCommentLimit = parseBoundedPositiveIntegerInput(
        getInput(INPUT_KEYS.BUGBOT_COMMENT_LIMIT),
        BUGBOT_MAX_COMMENTS,
        200,
    );
    const bugbotFixVerifyCommandsInput = getInput(INPUT_KEYS.BUGBOT_FIX_VERIFY_COMMANDS);
    const bugbotFixVerifyCommands = bugbotFixVerifyCommandsInput
        .split(',')
        .map((c) => c.trim())
        .filter((c) => c.length > 0);

    /**
     * Projects Details
     */
    const projectIdsInput: string = getInput(INPUT_KEYS.PROJECT_IDS);
    const projectIds: string[] = parseDelimitedValues(projectIdsInput);

    const projects = await loadProjectDetails(projectRepository, projectIds, token);

    const projectColumnIssueCreated = getInput(INPUT_KEYS.PROJECT_COLUMN_ISSUE_CREATED)
    const projectColumnPullRequestCreated = getInput(INPUT_KEYS.PROJECT_COLUMN_PULL_REQUEST_CREATED)
    const projectColumnIssueInProgress = getInput(INPUT_KEYS.PROJECT_COLUMN_ISSUE_IN_PROGRESS)
    const projectColumnPullRequestInProgress = getInput(INPUT_KEYS.PROJECT_COLUMN_PULL_REQUEST_IN_PROGRESS)

    /**
     * Images
     */
    const imagesOnIssue = isEnabledInput(getInput(INPUT_KEYS.IMAGES_ON_ISSUE));
    const imagesOnPullRequest = isEnabledInput(getInput(INPUT_KEYS.IMAGES_ON_PULL_REQUEST));
    const imagesOnCommit = isEnabledInput(getInput(INPUT_KEYS.IMAGES_ON_COMMIT));

    const imagesIssueAutomaticInput: string = getInput(INPUT_KEYS.IMAGES_ISSUE_AUTOMATIC);
    const imagesIssueAutomatic: string[] = imagesIssueAutomaticInput
        .split(',')
        .map(url => url.trim())
        .filter(url => url.length > 0);
    
    if (imagesIssueAutomatic.length === 0) {
        imagesIssueAutomatic.push(...DEFAULT_IMAGE_CONFIG.issue.automatic);
    }

    const imagesIssueFeatureInput: string = getInput(INPUT_KEYS.IMAGES_ISSUE_FEATURE);
    const imagesIssueFeature: string[] = imagesIssueFeatureInput
        .split(',')
        .map(url => url.trim())
        .filter(url => url.length > 0);
    
    if (imagesIssueFeature.length === 0) {
        imagesIssueFeature.push(...DEFAULT_IMAGE_CONFIG.issue.feature);
    }

    const imagesIssueBugfixInput: string = getInput(INPUT_KEYS.IMAGES_ISSUE_BUGFIX);
    const imagesIssueBugfix: string[] = imagesIssueBugfixInput
        .split(',')
        .map(url => url.trim())
        .filter(url => url.length > 0);
    
    if (imagesIssueBugfix.length === 0) {
        imagesIssueBugfix.push(...DEFAULT_IMAGE_CONFIG.issue.bugfix);
    }

    const imagesIssueDocsInput: string = getInput(INPUT_KEYS.IMAGES_ISSUE_DOCS);
    const imagesIssueDocs: string[] = imagesIssueDocsInput
        .split(',')
        .map(url => url.trim())
        .filter(url => url.length > 0);
    
    if (imagesIssueDocs.length === 0) {
        imagesIssueDocs.push(...DEFAULT_IMAGE_CONFIG.issue.docs);
    }

    const imagesIssueChoreInput: string = getInput(INPUT_KEYS.IMAGES_ISSUE_CHORE);
    const imagesIssueChore: string[] = imagesIssueChoreInput
        .split(',')
        .map(url => url.trim())
        .filter(url => url.length > 0);
    
    if (imagesIssueChore.length === 0) {
        imagesIssueChore.push(...DEFAULT_IMAGE_CONFIG.issue.chore);
    }

    const imagesIssueReleaseInput: string = getInput(INPUT_KEYS.IMAGES_ISSUE_RELEASE);
    const imagesIssueRelease: string[] = imagesIssueReleaseInput
        .split(',')
        .map(url => url.trim())
        .filter(url => url.length > 0);
    
    if (imagesIssueRelease.length === 0) {
        imagesIssueRelease.push(...DEFAULT_IMAGE_CONFIG.issue.release);
    }

    const imagesIssueHotfixInput: string = getInput(INPUT_KEYS.IMAGES_ISSUE_HOTFIX);
    const imagesIssueHotfix: string[] = imagesIssueHotfixInput
        .split(',')
        .map(url => url.trim())
        .filter(url => url.length > 0);
    
    if (imagesIssueHotfix.length === 0) {
        imagesIssueHotfix.push(...DEFAULT_IMAGE_CONFIG.issue.hotfix);
    }

    const imagesPullRequestAutomaticInput: string = getInput(INPUT_KEYS.IMAGES_PULL_REQUEST_AUTOMATIC);
    const imagesPullRequestAutomatic: string[] = imagesPullRequestAutomaticInput
        .split(',')
        .map(url => url.trim())
        .filter(url => url.length > 0);
    
    if (imagesPullRequestAutomatic.length === 0) {
        imagesPullRequestAutomatic.push(...DEFAULT_IMAGE_CONFIG.pullRequest.automatic);
    }

    const imagesPullRequestFeatureInput: string = getInput(INPUT_KEYS.IMAGES_PULL_REQUEST_FEATURE);
    const imagesPullRequestFeature: string[] = imagesPullRequestFeatureInput
        .split(',')
        .map(url => url.trim())
        .filter(url => url.length > 0);
    
    if (imagesPullRequestFeature.length === 0) {
        imagesPullRequestFeature.push(...DEFAULT_IMAGE_CONFIG.pullRequest.feature);
    }

    const imagesPullRequestBugfixInput: string = getInput(INPUT_KEYS.IMAGES_PULL_REQUEST_BUGFIX);
    const imagesPullRequestBugfix: string[] = imagesPullRequestBugfixInput
        .split(',')
        .map(url => url.trim())
        .filter(url => url.length > 0);
    
    if (imagesPullRequestBugfix.length === 0) {
        imagesPullRequestBugfix.push(...DEFAULT_IMAGE_CONFIG.pullRequest.bugfix);
    }

    const imagesPullRequestReleaseInput: string = getInput(INPUT_KEYS.IMAGES_PULL_REQUEST_RELEASE);
    const imagesPullRequestRelease: string[] = imagesPullRequestReleaseInput
        .split(',')
        .map(url => url.trim())
        .filter(url => url.length > 0);
    
    if (imagesPullRequestRelease.length === 0) {
        imagesPullRequestRelease.push(...DEFAULT_IMAGE_CONFIG.pullRequest.release);
    }

    const imagesPullRequestHotfixInput: string = getInput(INPUT_KEYS.IMAGES_PULL_REQUEST_HOTFIX);
    const imagesPullRequestHotfix: string[] = imagesPullRequestHotfixInput
        .split(',')
        .map(url => url.trim())
        .filter(url => url.length > 0);
    
    if (imagesPullRequestHotfix.length === 0) {
        imagesPullRequestHotfix.push(...DEFAULT_IMAGE_CONFIG.pullRequest.hotfix);
    }

    const imagesPullRequestDocsInput: string = getInput(INPUT_KEYS.IMAGES_PULL_REQUEST_DOCS);
    const imagesPullRequestDocs: string[] = imagesPullRequestDocsInput
        .split(',')
        .map(url => url.trim())
        .filter(url => url.length > 0);
    
    if (imagesPullRequestDocs.length === 0) {
        imagesPullRequestDocs.push(...DEFAULT_IMAGE_CONFIG.pullRequest.docs);
    }

    const imagesPullRequestChoreInput: string = getInput(INPUT_KEYS.IMAGES_PULL_REQUEST_CHORE);
    const imagesPullRequestChore: string[] = imagesPullRequestChoreInput
        .split(',')
        .map(url => url.trim())
        .filter(url => url.length > 0);
    
    if (imagesPullRequestChore.length === 0) {
        imagesPullRequestChore.push(...DEFAULT_IMAGE_CONFIG.pullRequest.chore);
    }

    const imagesCommitAutomaticInput: string = getInput(INPUT_KEYS.IMAGES_COMMIT_AUTOMATIC);
    const imagesCommitAutomatic: string[] = imagesCommitAutomaticInput
        .split(',')
        .map(url => url.trim())
        .filter(url => url.length > 0);
    
    if (imagesCommitAutomatic.length === 0) {
        imagesCommitAutomatic.push(...DEFAULT_IMAGE_CONFIG.commit.automatic);
    }

    const imagesCommitFeatureInput: string = getInput(INPUT_KEYS.IMAGES_COMMIT_FEATURE);
    const imagesCommitFeature: string[] = imagesCommitFeatureInput
        .split(',')
        .map(url => url.trim())
        .filter(url => url.length > 0);
    
    if (imagesCommitFeature.length === 0) {
        imagesCommitFeature.push(...DEFAULT_IMAGE_CONFIG.commit.feature);
    }

    const imagesCommitBugfixInput: string = getInput(INPUT_KEYS.IMAGES_COMMIT_BUGFIX);
    const imagesCommitBugfix: string[] = imagesCommitBugfixInput
        .split(',')
        .map(url => url.trim())
        .filter(url => url.length > 0);
    
    if (imagesCommitBugfix.length === 0) {
        imagesCommitBugfix.push(...DEFAULT_IMAGE_CONFIG.commit.bugfix);
    }

    const imagesCommitReleaseInput: string = getInput(INPUT_KEYS.IMAGES_COMMIT_RELEASE);
    const imagesCommitRelease: string[] = imagesCommitReleaseInput
        .split(',')
        .map(url => url.trim())
        .filter(url => url.length > 0);
    
    if (imagesCommitRelease.length === 0) {
        imagesCommitRelease.push(...DEFAULT_IMAGE_CONFIG.commit.release);
    }

    const imagesCommitHotfixInput: string = getInput(INPUT_KEYS.IMAGES_COMMIT_HOTFIX);
    const imagesCommitHotfix: string[] = imagesCommitHotfixInput
        .split(',')
        .map(url => url.trim())
        .filter(url => url.length > 0);
    
    if (imagesCommitHotfix.length === 0) {
        imagesCommitHotfix.push(...DEFAULT_IMAGE_CONFIG.commit.hotfix);
    }

    const imagesCommitDocsInput: string = getInput(INPUT_KEYS.IMAGES_COMMIT_DOCS);
    const imagesCommitDocs: string[] = imagesCommitDocsInput
        .split(',')
        .map(url => url.trim())
        .filter(url => url.length > 0);
    
    if (imagesCommitDocs.length === 0) {
        imagesCommitDocs.push(...DEFAULT_IMAGE_CONFIG.commit.docs);
    }

    const imagesCommitChoreInput: string = getInput(INPUT_KEYS.IMAGES_COMMIT_CHORE);
    const imagesCommitChore: string[] = imagesCommitChoreInput
        .split(',')
        .map(url => url.trim())
        .filter(url => url.length > 0);
    
    if (imagesCommitChore.length === 0) {
        imagesCommitChore.push(...DEFAULT_IMAGE_CONFIG.commit.chore);
    }

    /**
     * Workflows
     */
    const releaseWorkflow = getInput(INPUT_KEYS.RELEASE_WORKFLOW);
    const hotfixWorkflow = getInput(INPUT_KEYS.HOTFIX_WORKFLOW);

    /**
     * Emoji-title
     */
    const titleEmoji = getInput(INPUT_KEYS.EMOJI_LABELED_TITLE) === 'true';
    const branchManagementEmoji = getInput(INPUT_KEYS.BRANCH_MANAGEMENT_EMOJI);

    /**
     * Labels
     */
    const branchManagementLauncherLabel = getInput(INPUT_KEYS.BRANCH_MANAGEMENT_LAUNCHER_LABEL);
    const bugfixLabel = getInput(INPUT_KEYS.BUGFIX_LABEL);
    const bugLabel = getInput(INPUT_KEYS.BUG_LABEL);
    const hotfixLabel = getInput(INPUT_KEYS.HOTFIX_LABEL);
    const enhancementLabel = getInput(INPUT_KEYS.ENHANCEMENT_LABEL);
    const featureLabel = getInput(INPUT_KEYS.FEATURE_LABEL);
    const releaseLabel = getInput(INPUT_KEYS.RELEASE_LABEL);
    const questionLabel = getInput(INPUT_KEYS.QUESTION_LABEL);
    const helpLabel = getInput(INPUT_KEYS.HELP_LABEL);
    const deployLabel = getInput(INPUT_KEYS.DEPLOY_LABEL);
    const deployedLabel = getInput(INPUT_KEYS.DEPLOYED_LABEL);
    const docsLabel = getInput(INPUT_KEYS.DOCS_LABEL);
    const documentationLabel = getInput(INPUT_KEYS.DOCUMENTATION_LABEL);
    const choreLabel = getInput(INPUT_KEYS.CHORE_LABEL);
    const maintenanceLabel = getInput(INPUT_KEYS.MAINTENANCE_LABEL);
    const priorityHighLabel = getInput(INPUT_KEYS.PRIORITY_HIGH_LABEL);
    const priorityMediumLabel = getInput(INPUT_KEYS.PRIORITY_MEDIUM_LABEL);
    const priorityLowLabel = getInput(INPUT_KEYS.PRIORITY_LOW_LABEL);
    const priorityNoneLabel = getInput(INPUT_KEYS.PRIORITY_NONE_LABEL);
    const sizeXxlLabel = getInput(INPUT_KEYS.SIZE_XXL_LABEL);
    const sizeXlLabel = getInput(INPUT_KEYS.SIZE_XL_LABEL);
    const sizeLLabel = getInput(INPUT_KEYS.SIZE_L_LABEL);
    const sizeMLabel = getInput(INPUT_KEYS.SIZE_M_LABEL);
    const sizeSLabel = getInput(INPUT_KEYS.SIZE_S_LABEL);
    const sizeXsLabel = getInput(INPUT_KEYS.SIZE_XS_LABEL);

    /**
     * Issue Types
     */
    const issueTypeBug = getInput(INPUT_KEYS.ISSUE_TYPE_BUG);
    const issueTypeBugDescription = getInput(INPUT_KEYS.ISSUE_TYPE_BUG_DESCRIPTION);
    const issueTypeBugColor = getInput(INPUT_KEYS.ISSUE_TYPE_BUG_COLOR);

    const issueTypeHotfix = getInput(INPUT_KEYS.ISSUE_TYPE_HOTFIX);
    const issueTypeHotfixDescription = getInput(INPUT_KEYS.ISSUE_TYPE_HOTFIX_DESCRIPTION);
    const issueTypeHotfixColor = getInput(INPUT_KEYS.ISSUE_TYPE_HOTFIX_COLOR);

    const issueTypeFeature = getInput(INPUT_KEYS.ISSUE_TYPE_FEATURE);
    const issueTypeFeatureDescription = getInput(INPUT_KEYS.ISSUE_TYPE_FEATURE_DESCRIPTION);
    const issueTypeFeatureColor = getInput(INPUT_KEYS.ISSUE_TYPE_FEATURE_COLOR);

    const issueTypeDocumentation = getInput(INPUT_KEYS.ISSUE_TYPE_DOCUMENTATION);
    const issueTypeDocumentationDescription = getInput(INPUT_KEYS.ISSUE_TYPE_DOCUMENTATION_DESCRIPTION);
    const issueTypeDocumentationColor = getInput(INPUT_KEYS.ISSUE_TYPE_DOCUMENTATION_COLOR);

    const issueTypeMaintenance = getInput(INPUT_KEYS.ISSUE_TYPE_MAINTENANCE);
    const issueTypeMaintenanceDescription = getInput(INPUT_KEYS.ISSUE_TYPE_MAINTENANCE_DESCRIPTION);
    const issueTypeMaintenanceColor = getInput(INPUT_KEYS.ISSUE_TYPE_MAINTENANCE_COLOR);

    const issueTypeRelease = getInput(INPUT_KEYS.ISSUE_TYPE_RELEASE);
    const issueTypeReleaseDescription = getInput(INPUT_KEYS.ISSUE_TYPE_RELEASE_DESCRIPTION);
    const issueTypeReleaseColor = getInput(INPUT_KEYS.ISSUE_TYPE_RELEASE_COLOR);

    const issueTypeQuestion = getInput(INPUT_KEYS.ISSUE_TYPE_QUESTION);
    const issueTypeQuestionDescription = getInput(INPUT_KEYS.ISSUE_TYPE_QUESTION_DESCRIPTION);
    const issueTypeQuestionColor = getInput(INPUT_KEYS.ISSUE_TYPE_QUESTION_COLOR);

    const issueTypeHelp = getInput(INPUT_KEYS.ISSUE_TYPE_HELP);
    const issueTypeHelpDescription = getInput(INPUT_KEYS.ISSUE_TYPE_HELP_DESCRIPTION);
    const issueTypeHelpColor = getInput(INPUT_KEYS.ISSUE_TYPE_HELP_COLOR);

    const issueTypeTask = getInput(INPUT_KEYS.ISSUE_TYPE_TASK);
    const issueTypeTaskDescription = getInput(INPUT_KEYS.ISSUE_TYPE_TASK_DESCRIPTION);
    const issueTypeTaskColor = getInput(INPUT_KEYS.ISSUE_TYPE_TASK_COLOR);

    /**
     * Locale
     */
    const issueLocale = getInput(INPUT_KEYS.ISSUES_LOCALE) ?? Locale.DEFAULT;
    const pullRequestLocale = getInput(INPUT_KEYS.PULL_REQUESTS_LOCALE) ?? Locale.DEFAULT;

    /**
     * Size Thresholds
     */
    const sizeXxlThresholdLines = parseIntegerInput(getInput(INPUT_KEYS.SIZE_XXL_THRESHOLD_LINES), 1000);
    const sizeXxlThresholdFiles = parseIntegerInput(getInput(INPUT_KEYS.SIZE_XXL_THRESHOLD_FILES), 20);
    const sizeXxlThresholdCommits = parseIntegerInput(getInput(INPUT_KEYS.SIZE_XXL_THRESHOLD_COMMITS), 10);
    const sizeXlThresholdLines = parseIntegerInput(getInput(INPUT_KEYS.SIZE_XL_THRESHOLD_LINES), 500);
    const sizeXlThresholdFiles = parseIntegerInput(getInput(INPUT_KEYS.SIZE_XL_THRESHOLD_FILES), 10);
    const sizeXlThresholdCommits = parseIntegerInput(getInput(INPUT_KEYS.SIZE_XL_THRESHOLD_COMMITS), 5);
    const sizeLThresholdLines = parseIntegerInput(getInput(INPUT_KEYS.SIZE_L_THRESHOLD_LINES), 250);
    const sizeLThresholdFiles = parseIntegerInput(getInput(INPUT_KEYS.SIZE_L_THRESHOLD_FILES), 5);
    const sizeLThresholdCommits = parseIntegerInput(getInput(INPUT_KEYS.SIZE_L_THRESHOLD_COMMITS), 3);
    const sizeMThresholdLines = parseIntegerInput(getInput(INPUT_KEYS.SIZE_M_THRESHOLD_LINES), 100);
    const sizeMThresholdFiles = parseIntegerInput(getInput(INPUT_KEYS.SIZE_M_THRESHOLD_FILES), 3);
    const sizeMThresholdCommits = parseIntegerInput(getInput(INPUT_KEYS.SIZE_M_THRESHOLD_COMMITS), 2);
    const sizeSThresholdLines = parseIntegerInput(getInput(INPUT_KEYS.SIZE_S_THRESHOLD_LINES), 50);
    const sizeSThresholdFiles = parseIntegerInput(getInput(INPUT_KEYS.SIZE_S_THRESHOLD_FILES), 2);
    const sizeSThresholdCommits = parseIntegerInput(getInput(INPUT_KEYS.SIZE_S_THRESHOLD_COMMITS), 1);
    const sizeXsThresholdLines = parseIntegerInput(getInput(INPUT_KEYS.SIZE_XS_THRESHOLD_LINES), 25);
    const sizeXsThresholdFiles = parseIntegerInput(getInput(INPUT_KEYS.SIZE_XS_THRESHOLD_FILES), 1);
    const sizeXsThresholdCommits = parseIntegerInput(getInput(INPUT_KEYS.SIZE_XS_THRESHOLD_COMMITS), 1);
    
    /**
     * Branches
     */
    const mainBranch = getInput(INPUT_KEYS.MAIN_BRANCH);
    const developmentBranch = getInput(INPUT_KEYS.DEVELOPMENT_BRANCH);
    const featureTree = getInput(INPUT_KEYS.FEATURE_TREE);
    const bugfixTree = getInput(INPUT_KEYS.BUGFIX_TREE);
    const hotfixTree = getInput(INPUT_KEYS.HOTFIX_TREE);
    const releaseTree = getInput(INPUT_KEYS.RELEASE_TREE);
    const docsTree = getInput(INPUT_KEYS.DOCS_TREE);
    const choreTree = getInput(INPUT_KEYS.CHORE_TREE);

    /**
     * Prefix builder
     */
    let commitPrefixBuilder = getInput(INPUT_KEYS.COMMIT_PREFIX_TRANSFORMS) ?? '';
    if (commitPrefixBuilder.length === 0) {
        commitPrefixBuilder = 'replace-slash';
    }

    /**
     * Issue
     */
    const branchManagementAlways = isEnabledInput(getInput(INPUT_KEYS.BRANCH_MANAGEMENT_ALWAYS));
    const reopenIssueOnPush = isEnabledInput(getInput(INPUT_KEYS.REOPEN_ISSUE_ON_PUSH));
    const issueDesiredAssigneesCount = parseIntegerInput(getInput(INPUT_KEYS.DESIRED_ASSIGNEES_COUNT), 0);

    /**
     * Pull Request
     */
    const pullRequestDesiredAssigneesCount = parseIntegerInput(getInput(INPUT_KEYS.PULL_REQUEST_DESIRED_ASSIGNEES_COUNT), 0);
    const pullRequestDesiredReviewersCount = parseIntegerInput(getInput(INPUT_KEYS.PULL_REQUEST_DESIRED_REVIEWERS_COUNT), 0);
    const pullRequestMergeTimeout = parseIntegerInput(getInput(INPUT_KEYS.PULL_REQUEST_MERGE_TIMEOUT), 0);

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
        buildIssue(branchManagementAlways, reopenIssueOnPush, issueDesiredAssigneesCount),
        buildPullRequest(pullRequestDesiredAssigneesCount, pullRequestDesiredReviewersCount, pullRequestMergeTimeout),
        buildEmoji(titleEmoji, branchManagementEmoji),
        buildImages({
            onIssue: imagesOnIssue,
            onPullRequest: imagesOnPullRequest,
            onCommit: imagesOnCommit,
            issue: { automatic: imagesIssueAutomatic, feature: imagesIssueFeature, bugfix: imagesIssueBugfix, release: imagesIssueRelease, hotfix: imagesIssueHotfix, docs: imagesIssueDocs, chore: imagesIssueChore },
            pullRequest: { automatic: imagesPullRequestAutomatic, feature: imagesPullRequestFeature, bugfix: imagesPullRequestBugfix, release: imagesPullRequestRelease, hotfix: imagesPullRequestHotfix, docs: imagesPullRequestDocs, chore: imagesPullRequestChore },
            commit: { automatic: imagesCommitAutomatic, feature: imagesCommitFeature, bugfix: imagesCommitBugfix, release: imagesCommitRelease, hotfix: imagesCommitHotfix, docs: imagesCommitDocs, chore: imagesCommitChore },
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
        undefined,
        undefined,
    )

    logDebugInfo(`Execution built. Event will be resolved in mainRun. Single action: ${execution.singleAction.currentSingleAction ?? 'none'}, AI PR description: ${execution.ai.getAiPullRequestDescription()}, bugbot min severity: ${execution.ai.getBugbotMinSeverity()}.`);

    const results: Result[] = await mainRun(execution);

    await finishWithResults(execution, results);
    } finally {
        if (managedOpencodeServer) {
            logInfo('Stopping OpenCode server...');
            await managedOpencodeServer.stop();
            logInfo('OpenCode server stopped.');
        }
    }
}

async function finishWithResults(execution: Execution, results: Result[]): Promise<void> {
    const stepCount = results.reduce((acc, r) => acc + (r.steps?.length ?? 0), 0);
    const errorCount = results.reduce((acc, r) => acc + (r.errors?.length ?? 0), 0);
    logInfo(`Publishing result: ${results.length} result(s), ${stepCount} step(s), ${errorCount} error(s).`);

    execution.currentConfiguration.results = results;
    await new PublishResultUseCase().invoke(execution);
    await new StoreConfigurationUseCase().invoke(execution);
    logInfo('Configuration stored. Finishing.');

    /**
     * If a single action is executed and the last step failed, throw an error
     */
    if (execution.isSingleAction && execution.singleAction.throwError) {
        setFirstErrorIfExists(results);
    }
}

function getInput(key: string, options?: { required?: boolean }): string {
    try {
        const inputVarsJson = process.env.INPUT_VARS_JSON;
        if (inputVarsJson) {
            const inputVars = JSON.parse(inputVarsJson);
            const value = inputVars[`INPUT_${key.toUpperCase()}`];
            if (value !== undefined) {
                return value;
            }
        }
    } catch (error) {
        logError(`Error parsing INPUT_VARS_JSON: ${JSON.stringify(error, null, 2)}`);
    }

    // Fallback to core.getInput
    return core.getInput(key, options);
}

function setFirstErrorIfExists(results: Result[]): void {
    for (const result of results) {
        if (result.errors && result.errors.length > 0) {
            core.setFailed(result.errors[0]);
            return;
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