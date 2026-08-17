import * as core from "@actions/core";
import type { GithubClientPort, GithubIssueTitleClient } from './github/github_client_port';
import { logDebugInfo } from '../../utils/logger';
import { IssueContentRepository } from './issue/issue_content_repository';
import { IssueMetadataRepository } from './issue/issue_metadata_repository';
import { IssueLabelRepository } from './issue/issue_label_repository';
import { IssueProgressLabelRepository } from './issue/issue_progress_label_repository';
import { IssueLabelProvisioningRepository } from './issue/issue_label_provisioning_repository';
import { IssueTypeRepository } from './issue/issue_type_repository';
import { IssueTypeAssignmentRepository } from './issue/issue_type_assignment_repository';
import { IssueAssignmentRepository } from './issue/issue_assignment_repository';
import { IssueLifecycleRepository } from './issue/issue_lifecycle_repository';
import { sanitizeIssueTitle, sanitizePullRequestTitle } from './issue_title_policy';
import { Labels } from "../model/labels";
import { resolveIssueTitleEmoji, resolvePullRequestTitleEmoji } from './issue_emoji_policy';
export { PROGRESS_LABEL_PATTERN } from './progress_labels';

export class IssueRepository {
    private readonly issueContentRepository: IssueContentRepository;
    private readonly issueMetadataRepository: IssueMetadataRepository;
    private readonly issueLabelRepository: IssueLabelRepository;
    private readonly issueProgressLabelRepository: IssueProgressLabelRepository;
    private readonly issueLabelProvisioningRepository: IssueLabelProvisioningRepository;
    private readonly issueTypeRepository: IssueTypeRepository;
    private readonly issueTypeAssignmentRepository: IssueTypeAssignmentRepository;
    private readonly issueAssignmentRepository: IssueAssignmentRepository;
    private readonly issueLifecycleRepository: IssueLifecycleRepository;
    private readonly issueTitleClient: GithubClientPort<GithubIssueTitleClient>;

    constructor(
        issueContentRepository: IssueContentRepository,
        issueMetadataRepository: IssueMetadataRepository,
        issueLabelRepository: IssueLabelRepository,
        issueAssignmentRepository: IssueAssignmentRepository,
        issueLabelProvisioningRepository: IssueLabelProvisioningRepository,
        issueTypeRepository: IssueTypeRepository,
        issueTypeAssignmentRepository: IssueTypeAssignmentRepository,
        issueLifecycleRepository: IssueLifecycleRepository,
        issueTitleClient: GithubClientPort<GithubIssueTitleClient>,
    ) {
        this.issueContentRepository = issueContentRepository;
        this.issueMetadataRepository = issueMetadataRepository;
        this.issueLabelRepository = issueLabelRepository;
        this.issueProgressLabelRepository = new IssueProgressLabelRepository(issueLabelRepository);
        this.issueAssignmentRepository = issueAssignmentRepository;
        this.issueLabelProvisioningRepository = issueLabelProvisioningRepository;
        this.issueTypeRepository = issueTypeRepository;
        this.issueTypeAssignmentRepository = issueTypeAssignmentRepository;
        this.issueLifecycleRepository = issueLifecycleRepository;
        this.issueTitleClient = issueTitleClient;
    }

    updateTitleIssueFormat = async (
        owner: string,
        repository: string,
        version: string,
        issueTitle: string,
        issueNumber: number,
        branchManagementAlways: boolean,
        branchManagementEmoji: string,
        labels: Labels,
        token: string,
    ): Promise<string | undefined> => {
        try {
            const octokit = this.issueTitleClient.getClient(token);

            const emoji = resolveIssueTitleEmoji(labels, branchManagementAlways, branchManagementEmoji);

            const sanitizedTitle = sanitizeIssueTitle(issueTitle);

            let formattedTitle = `${emoji} - ${sanitizedTitle}`;
            if (version.length > 0) {
                formattedTitle = `${emoji} - ${version} - ${sanitizedTitle}`;
            }

            if (formattedTitle !== issueTitle) {
                await octokit.rest.issues.update({
                    owner: owner,
                    repo: repository,
                    issue_number: issueNumber,
                    title: formattedTitle,
                });

                logDebugInfo(`Issue title updated to: ${formattedTitle}`);
                return formattedTitle;
            }

            return undefined;
        } catch (error) {
            core.setFailed(`Failed to check or update issue title: ${error}`);
            return undefined;
        }
    };

    updateTitlePullRequestFormat = async (
        owner: string,
        repository: string,
        pullRequestTitle: string,
        issueTitle: string,
        issueNumber: number,
        pullRequestNumber: number,
        branchManagementAlways: boolean,
        branchManagementEmoji: string,
        labels: Labels,
        token: string,
    ): Promise<string | undefined> => {
        try {
            const octokit = this.issueTitleClient.getClient(token);

            const emoji = resolvePullRequestTitleEmoji(labels, branchManagementAlways, branchManagementEmoji);

            const sanitizedTitle = sanitizePullRequestTitle(issueTitle);

            const formattedTitle = `[#${issueNumber}] ${emoji} - ${sanitizedTitle}`;

            if (formattedTitle !== pullRequestTitle) {
                await octokit.rest.issues.update({
                    owner: owner,
                    repo: repository,
                    issue_number: pullRequestNumber,
                    title: formattedTitle,
                });

                logDebugInfo(`Issue title updated to: ${formattedTitle}`);
                return formattedTitle;
            }

            return undefined;
        } catch (error) {
            core.setFailed(`Failed to check or update issue title: ${error}`);
            return undefined;
        }
    };

    cleanTitle = async (
        owner: string,
        repository: string,
        issueTitle: string,
        issueNumber: number,
        token: string,
    ): Promise<string | undefined> => {
        try {
            const octokit = this.issueTitleClient.getClient(token);

            const sanitizedTitle = sanitizePullRequestTitle(issueTitle);

            if (sanitizedTitle !== issueTitle) {
                await octokit.rest.issues.update({
                    owner: owner,
                    repo: repository,
                    issue_number: issueNumber,
                    title: sanitizedTitle,
                });

                logDebugInfo(`Issue title updated to: ${sanitizedTitle}`);
                return sanitizedTitle;
            }

            return undefined;
        } catch (error) {
            core.setFailed(`Failed to check or update issue title: ${error}`);
            return undefined;
        }
    };


    updateDescription = (...args: Parameters<IssueContentRepository["updateDescription"]>) => this.issueContentRepository.updateDescription(...args);

    getDescription = (...args: Parameters<IssueContentRepository["getDescription"]>) => this.issueContentRepository.getDescription(...args);

    getId = (...args: Parameters<IssueMetadataRepository["getId"]>) => this.issueMetadataRepository.getId(...args);

    getMilestone = (...args: Parameters<IssueMetadataRepository["getMilestone"]>) => this.issueMetadataRepository.getMilestone(...args);

    getTitle = (...args: Parameters<IssueMetadataRepository["getTitle"]>) => this.issueMetadataRepository.getTitle(...args);

    getLabels = (...args: Parameters<IssueLabelRepository["getLabels"]>) => this.issueLabelRepository.getLabels(...args);

    setLabels = (...args: Parameters<IssueLabelRepository["setLabels"]>) => this.issueLabelRepository.setLabels(...args);

    ensureProgressLabels = (
        owner: string,
        repository: string,
        token: string,
    ) => this.issueProgressLabelRepository.ensureProgressLabels(
        owner,
        repository,
        token,
        (...args: Parameters<IssueRepository["ensureLabel"]>) => this.ensureLabel(...args),
    );

    setProgressLabel = (...args: Parameters<IssueProgressLabelRepository["setProgressLabel"]>) => this.issueProgressLabelRepository.setProgressLabel(...args);

    isIssue = (...args: Parameters<IssueMetadataRepository["isIssue"]>) => this.issueMetadataRepository.isIssue(...args);

    isPullRequest = (...args: Parameters<IssueMetadataRepository["isPullRequest"]>) => this.issueMetadataRepository.isPullRequest(...args);

    getHeadBranch = (...args: Parameters<IssueMetadataRepository["getHeadBranch"]>) => this.issueMetadataRepository.getHeadBranch(...args);

    addComment = (...args: Parameters<IssueContentRepository["addComment"]>) => this.issueContentRepository.addComment(...args);

    updateComment = (...args: Parameters<IssueContentRepository["updateComment"]>) => this.issueContentRepository.updateComment(...args);

    listIssueComments = (...args: Parameters<IssueContentRepository["listIssueComments"]>) => this.issueContentRepository.listIssueComments(...args);

    closeIssue = (...args: Parameters<IssueLifecycleRepository["closeIssue"]>) => this.issueLifecycleRepository.closeIssue(...args);

    openIssue = (...args: Parameters<IssueLifecycleRepository["openIssue"]>) => this.issueLifecycleRepository.openIssue(...args);

    getCurrentAssignees = (...args: Parameters<IssueAssignmentRepository["getCurrentAssignees"]>) => this.issueAssignmentRepository.getCurrentAssignees(...args);

    assignMembersToIssue = (...args: Parameters<IssueAssignmentRepository["assignMembersToIssue"]>) => this.issueAssignmentRepository.assignMembersToIssue(...args);

    getIssueDescription = (...args: Parameters<IssueContentRepository["getIssueDescription"]>) => this.issueContentRepository.getIssueDescription(...args);


    setIssueType = (...args: Parameters<IssueTypeAssignmentRepository["setIssueType"]>) => this.issueTypeAssignmentRepository.setIssueType(...args);

    listLabelsForRepo = (...args: Parameters<IssueLabelProvisioningRepository["listLabelsForRepo"]>) => this.issueLabelProvisioningRepository.listLabelsForRepo(...args);

    createLabel = (...args: Parameters<IssueLabelProvisioningRepository["createLabel"]>) => this.issueLabelProvisioningRepository.createLabel(...args);

    ensureLabel = (...args: Parameters<IssueLabelProvisioningRepository["ensureLabel"]>) => this.issueLabelProvisioningRepository.ensureLabel(...args);

    ensureLabels = (...args: Parameters<IssueLabelProvisioningRepository["ensureLabels"]>) => this.issueLabelProvisioningRepository.ensureLabels(...args);

    listIssueTypes = (...args: Parameters<IssueTypeRepository["listIssueTypes"]>) => this.issueTypeRepository.listIssueTypes(...args);

    createIssueType = (...args: Parameters<IssueTypeRepository["createIssueType"]>) => this.issueTypeRepository.createIssueType(...args);

    ensureIssueType = (...args: Parameters<IssueTypeRepository["ensureIssueType"]>) => this.issueTypeRepository.ensureIssueType(...args);

    ensureIssueTypes = (...args: Parameters<IssueTypeRepository["ensureIssueTypes"]>) => this.issueTypeRepository.ensureIssueTypes(...args);
}