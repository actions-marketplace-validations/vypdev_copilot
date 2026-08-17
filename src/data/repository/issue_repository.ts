import * as core from "@actions/core";
import * as github from "@actions/github";
import { logDebugInfo } from '../../utils/logger';
import { IssueContentRepository } from './issue/issue_content_repository';
import { IssueMetadataRepository } from './issue_metadata_repository';
import { IssueLabelRepository } from './issue_label_repository';
import { IssueProgressLabelRepository } from './issue_progress_label_repository';
import { IssueLabelProvisioningRepository } from './issue_label_provisioning_repository';
import { IssueTypeRepository } from './issue_type_repository';
import { IssueTypeAssignmentRepository } from './issue_type_assignment_repository';
import { IssueAssignmentRepository } from './issue_assignment_repository';
import { IssueLifecycleRepository } from './issue_lifecycle_repository';
import { sanitizeIssueTitle, sanitizePullRequestTitle } from './issue_title_policy';
import { Labels } from "../model/labels";
import { resolveIssueTitleEmoji, resolvePullRequestTitleEmoji } from './issue_emoji_policy';
export { PROGRESS_LABEL_PATTERN } from './progress_labels';

export class IssueRepository {
    private readonly issueContentRepository = new IssueContentRepository();
    private readonly issueMetadataRepository = new IssueMetadataRepository();
    private readonly issueLabelRepository = new IssueLabelRepository();
    private readonly issueProgressLabelRepository = new IssueProgressLabelRepository(this.issueLabelRepository);
    private readonly issueLabelProvisioningRepository = new IssueLabelProvisioningRepository();
    private readonly issueTypeRepository = new IssueTypeRepository();
    private readonly issueTypeAssignmentRepository = new IssueTypeAssignmentRepository(
        (owner, repository, issueNumber, token) => this.getId(owner, repository, issueNumber, token),
    );
    private readonly issueAssignmentRepository = new IssueAssignmentRepository();
    private readonly issueLifecycleRepository = new IssueLifecycleRepository();

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
            const octokit = github.getOctokit(token);

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
            const octokit = github.getOctokit(token);

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
            const octokit = github.getOctokit(token);

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


    updateDescription = this.issueContentRepository.updateDescription;

    getDescription = this.issueContentRepository.getDescription;

    getId = this.issueMetadataRepository.getId;

    getMilestone = this.issueMetadataRepository.getMilestone;

    getTitle = this.issueMetadataRepository.getTitle;

    getLabels = this.issueLabelRepository.getLabels;

    setLabels = this.issueLabelRepository.setLabels;

    ensureProgressLabels = (
        owner: string,
        repository: string,
        token: string,
    ) => this.issueProgressLabelRepository.ensureProgressLabels(
        owner,
        repository,
        token,
        this.ensureLabel,
    );

    setProgressLabel = this.issueProgressLabelRepository.setProgressLabel;

    isIssue = this.issueMetadataRepository.isIssue;

    isPullRequest = this.issueMetadataRepository.isPullRequest;

    getHeadBranch = this.issueMetadataRepository.getHeadBranch;

    addComment = this.issueContentRepository.addComment;

    updateComment = this.issueContentRepository.updateComment;

    listIssueComments = this.issueContentRepository.listIssueComments;

    closeIssue = this.issueLifecycleRepository.closeIssue;

    openIssue = this.issueLifecycleRepository.openIssue;

    getCurrentAssignees = this.issueAssignmentRepository.getCurrentAssignees;

    assignMembersToIssue = this.issueAssignmentRepository.assignMembersToIssue;

    getIssueDescription = this.issueContentRepository.getIssueDescription;


    setIssueType = this.issueTypeAssignmentRepository.setIssueType;

    listLabelsForRepo = this.issueLabelProvisioningRepository.listLabelsForRepo;

    createLabel = this.issueLabelProvisioningRepository.createLabel;

    ensureLabel = this.issueLabelProvisioningRepository.ensureLabel;

    ensureLabels = this.issueLabelProvisioningRepository.ensureLabels;

    listIssueTypes = this.issueTypeRepository.listIssueTypes;

    createIssueType = this.issueTypeRepository.createIssueType;

    ensureIssueType = this.issueTypeRepository.ensureIssueType;

    ensureIssueTypes = this.issueTypeRepository.ensureIssueTypes;
}