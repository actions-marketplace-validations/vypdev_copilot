import { ConfigurationHandler } from "../../manager/description/configuration_handler";
import { shouldSkipInitialLabelsFetch } from './initial_labels_policy';
import { branchesForManagement, typesForIssue } from "../../utils/label_utils";
import { logDebugInfo, setGlobalLoggerDebug } from "../../utils/logger";
import type { LatestTagQueryPort } from '../../application/ports/branch_tag_ports';
import { Ai } from "./ai";
import { Branches } from "./branches";
import { Commit } from "./commit";
import { Config } from "./config";
import { Emoji } from "./emoji";
import { Hotfix } from "./hotfix";
import { Images } from "./images";
import { Issue } from "./issue";
import { IssueTypes } from "./issue_types";
import { Labels } from "./labels";
import { Locale } from "./locale";
import { Projects } from "./projects";
import { PullRequest } from "./pull_request";
import { Release } from "./release";
import { SingleAction } from "./single_action";
import { SizeThresholds } from "./size_thresholds";
import { Tokens } from "./tokens";
import { Welcome } from "./welcome";
import { Workflows } from "./workflows";
import { resolveExecutionIssueNumber } from "./resolve_execution_issue_number";
import { resolveIssueBranchVersion } from './resolve_issue_branch_version';
import { restorePreviousBranchState, type PreviousBranchState } from './previous_branch_state_policy';

export interface ExecutionIssueSetupPort {
    isPullRequest(owner: string, repository: string, issueNumber: number, token: string): Promise<boolean>;
    isIssue(owner: string, repository: string, issueNumber: number, token: string): Promise<boolean>;
    getHeadBranch(owner: string, repository: string, issueNumber: number, token: string): Promise<string | undefined>;
    getLabels(owner: string, repo: string, issueNumber: number, token: string): Promise<string[]>;
    getDescription(owner: string, repo: string, issueNumber: number, token: string): Promise<string | undefined>;
    updateDescription(owner: string, repo: string, issueNumber: number, description: string, token: string): Promise<void>;
}

export interface ExecutionOrganizationSetupPort {
    getUserFromToken(token: string): Promise<string | undefined>;
}

export class Execution {
    debug: boolean = false;
    welcome: Welcome | undefined;
    /**
     * Every usage of this field should be checked.
     * PRs with no issue ID in the head branch won't have it.
     *
     * master <- develop
     */
    issueNumber: number = -1
    singleAction: SingleAction;
    commitPrefixBuilder: string;
    commitPrefixBuilderParams: Record<string, unknown> = {};
    emoji: Emoji;
    images: Images;
    tokens: Tokens;
    ai: Ai;
    labels: Labels;
    issueTypes: IssueTypes;
    locale: Locale;
    sizeThresholds: SizeThresholds;
    branches: Branches;
    release: Release;
    hotfix: Hotfix;
    issue: Issue;
    pullRequest: PullRequest;
    workflows: Workflows;
    project: Projects;
    previousConfiguration: Config | undefined;
    currentConfiguration: Config;
    tokenUser: string | undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- GitHub context payload shape is dynamic
    inputs: any | undefined;

    get eventName(): string {
        return this.inputs?.eventName ?? '';
    }

    get actor(): string {
        return this.inputs?.actor ?? '';
    }

    get isSingleAction(): boolean {
        return this.singleAction.enabledSingleAction;
    }

    get isIssue(): boolean {
        return this.issue.isIssue || this.issue.isIssueComment || this.singleAction.isIssue;
    }

    get isPullRequest(): boolean {
        return this.pullRequest.isPullRequest || this.pullRequest.isPullRequestReviewComment || this.singleAction.isPullRequest;
    }

    get isPush(): boolean {
        return this.eventName === 'push';
    }

    get repo(): string {
        return this.inputs?.repo?.repo ?? '';
    }

    get owner(): string {
        return this.inputs?.repo?.owner ?? '';
    }

    get isFeature(): boolean {
        return this.issueType === this.branches.featureTree;
    }

    get isBugfix(): boolean {
        return this.issueType === this.branches.bugfixTree;
    }

    get isDocs(): boolean {
        return this.issueType === this.branches.docsTree;
    }

    get isChore(): boolean {
        return this.issueType === this.branches.choreTree;
    }

    get isBranched(): boolean {
        return this.issue.branchManagementAlways ||
            this.labels.containsBranchedLabel ||
            this.labels.isMandatoryBranchedLabel;
    }

    get issueNotBranched(): boolean {
        return this.isIssue && !this.isBranched;
    }

    get managementBranch(): string {
        return branchesForManagement(
            this,
            this.labels.currentIssueLabels,
            this.labels.feature,
            this.labels.enhancement,
            this.labels.bugfix,
            this.labels.bug,
            this.labels.hotfix,
            this.labels.release,
            this.labels.docs,
            this.labels.documentation,
            this.labels.chore,
            this.labels.maintenance,
        );
    }

    get issueType(): string {
        return typesForIssue(
            this,
            this.labels.currentIssueLabels,
            this.labels.feature,
            this.labels.enhancement,
            this.labels.bugfix,
            this.labels.bug,
            this.labels.hotfix,
            this.labels.release,
            this.labels.docs,
            this.labels.documentation,
            this.labels.chore,
            this.labels.maintenance,
        );
    }

    get cleanIssueBranches(): boolean {
        return this.isIssue
            && this.previousConfiguration !== undefined
            && this.previousConfiguration?.branchType != this.currentConfiguration.branchType;
    }

    get commit(): Commit {
        return new Commit(this.inputs);
    }

    get runnedByToken(): boolean {
        return this.tokenUser === this.actor;
    }

    constructor(
        debug: boolean,
        singleAction: SingleAction,
        commitPrefixBuilder: string,
        issue: Issue,
        pullRequest: PullRequest,
        emoji: Emoji,
        giphy: Images,
        tokens: Tokens,
        ai: Ai,
        labels: Labels,
        issueTypes: IssueTypes,
        locale: Locale,
        sizeThresholds: SizeThresholds,
        branches: Branches,
        release: Release,
        hotfix: Hotfix,
        workflows: Workflows,
        project: Projects,
        welcome: Welcome | undefined,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- GitHub context payload
        inputs: any | undefined
    ) {
        this.debug = debug;
        this.singleAction = singleAction;
        this.commitPrefixBuilder = commitPrefixBuilder;
        this.issue = issue;
        this.pullRequest = pullRequest;
        this.images = giphy;
        this.tokens = tokens;
        this.ai = ai;
        this.emoji = emoji;
        this.labels = labels;
        this.issueTypes = issueTypes;
        this.locale = locale;
        this.sizeThresholds = sizeThresholds;
        this.branches = branches;
        this.release = release;
        this.hotfix = hotfix;
        this.project = project;
        this.workflows = workflows;
        this.currentConfiguration = new Config({});
        this.inputs = inputs;
        this.welcome = welcome;
    }

    private restorePreviousBranchState(state: PreviousBranchState): void {
        this.release.version = state.releaseVersion;
        this.release.branch = state.releaseBranch;
        this.hotfix.baseVersion = state.hotfixBaseVersion;
        this.hotfix.baseBranch = state.hotfixBaseBranch;
        this.hotfix.version = state.hotfixVersion;
        this.hotfix.branch = state.hotfixBranch;
        this.currentConfiguration.parentBranch = state.parentBranch;
        this.currentConfiguration.workingBranch = state.workingBranch;
        this.currentConfiguration.releaseBranch = state.releaseBranch;
        this.currentConfiguration.hotfixOriginBranch = state.hotfixBaseBranch;
        this.currentConfiguration.hotfixBranch = state.hotfixBranch;
    }

    setup = async (
        branchRepository: LatestTagQueryPort,
        issueRepository: ExecutionIssueSetupPort,
        organizationRepository: ExecutionOrganizationSetupPort,
    ) => {
        setGlobalLoggerDebug(this.debug, this.inputs === undefined);

        this.tokenUser = await organizationRepository.getUserFromToken(this.tokens.token);
        if (!this.tokenUser) {
            throw new Error('Failed to get user from token');
        }

        const resolvedIssueNumber = await resolveExecutionIssueNumber(this, issueRepository);
        if (resolvedIssueNumber === undefined) {
            return;
        }

        this.previousConfiguration = await new ConfigurationHandler(issueRepository).get(this)

        /**
         * Get labels of issue (skip if it's the initial setup and it fails)
         */
        try {
            this.labels.currentIssueLabels = await issueRepository.getLabels(
                this.owner,
                this.repo,
                this.issueNumber,
                this.tokens.token
            );
        } catch (error) {
            const isInitialSetup = shouldSkipInitialLabelsFetch(
                this.isSingleAction,
                this.singleAction.currentSingleAction,
            );
            if (isInitialSetup) {
                logDebugInfo('Skipping initial labels fetch for setup action.');
                this.labels.currentIssueLabels = [];
            } else {
                throw error;
            }
        }

        /**
         * Contains release label
         */
        this.release.active = this.labels.isRelease;
        this.hotfix.active = this.labels.isHotfix;

        const previousState = restorePreviousBranchState(
            this.previousConfiguration,
            this.release.active ? 'release' : this.hotfix.active ? 'hotfix' : 'default',
            this.branches.releaseTree,
            this.branches.hotfixTree,
        );
        this.restorePreviousBranchState(previousState);

        if (this.isSingleAction) {
            /**
             * Nothing to do here (for now)
             */
        } else if (this.isIssue) {
            const canContinue = await resolveIssueBranchVersion(this, branchRepository, issueRepository);
            if (!canContinue) return;
        } else if (this.isPullRequest) {
            this.labels.currentPullRequestLabels = await issueRepository.getLabels(
                this.owner,
                this.repo,
                this.pullRequest.number,
                this.tokens.token
            );
            this.release.active = this.pullRequest.base.indexOf(`${this.branches.releaseTree}/`) > -1
            this.hotfix.active = this.pullRequest.base.indexOf(`${this.branches.hotfixTree}/`) > -1

            if (!this.currentConfiguration.parentBranch) {
                this.currentConfiguration.parentBranch = this.pullRequest.base;
            }
        }

        this.currentConfiguration.branchType = this.issueType

        // logDebugInfo(`Current configuration: ${JSON.stringify(this.currentConfiguration, null, 2)}`);
    }
}