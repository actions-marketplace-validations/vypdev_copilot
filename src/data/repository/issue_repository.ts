import * as core from "@actions/core";
import * as github from "@actions/github";
import { logDebugInfo, logError } from "../../utils/logger";
import { IssueContentRepository } from './issue_content_repository';
import { IssueMetadataRepository } from './issue_metadata_repository';
import { IssueLabelRepository } from './issue_label_repository';
import { IssueProgressLabelRepository } from './issue_progress_label_repository';
import { IssueLabelProvisioningRepository } from './issue_label_provisioning_repository';
import { IssueTypeRepository } from './issue_type_repository';
import { IssueTypeAssignmentRepository } from './issue_type_assignment_repository';
import { Labels } from "../model/labels";

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

            let emoji = '🤖';

            const branched = branchManagementAlways || labels.containsBranchedLabel

            if (labels.isHotfix && branched) {
                emoji = `🔥${branchManagementEmoji}`;
            } else if (labels.isRelease && branched) {
                emoji = `🚀${branchManagementEmoji}`;
            } else if ((labels.isBugfix || labels.isBug) && branched) {
                emoji = `🐛${branchManagementEmoji}`;
            } else if ((labels.isFeature || labels.isEnhancement) && branched) {
                emoji = `✨${branchManagementEmoji}`;
            } else if ((labels.isDocs || labels.isDocumentation) && branched) {
                emoji = `📝${branchManagementEmoji}`;
            } else if ((labels.isChore || labels.isMaintenance) && branched) {
                emoji = `🔧${branchManagementEmoji}`;
            } else if (labels.isHotfix) {
                emoji = '🔥';
            } else if (labels.isRelease) {
                emoji = '🚀';
            } else if ((labels.isDocs || labels.isDocumentation)) {
                emoji = '📝';
            } else if (labels.isChore || labels.isMaintenance) {
                emoji = '🔧';
            } else if (labels.isBugfix || labels.isBug) {
                emoji = '🐛';
            } else if (labels.isFeature || labels.isEnhancement) {
                emoji = '✨';
            } else if (labels.isHelp) {
                emoji = '🆘';
            } else if (labels.isQuestion) {
                emoji = '❓';
            }

            const sanitizedTitle = issueTitle
                .replace(/\b\d+(\.\d+){2,}\b/g, '')
                .replace(/\bUnknown Version\b/gi, '')
                .replace(/[^\p{L}\p{N}\p{P}\p{Z}^$\n]/gu, '')
                .replace(/\u200D/g, '')
                .replace(/[^\S\r\n]+/g, ' ')
                .replace(/[^a-zA-Z0-9 .]/g, '')
                .replace(/^-+|-+$/g, '')
                .replace(/- -/g, '-').trim()
                .replace(/-+/g, '-')
                .trim();

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

            let emoji = '🤖';

            const branched = branchManagementAlways || labels.containsBranchedLabel

            if (labels.isHotfix && branched) {
                emoji = `🔥${branchManagementEmoji}`;
            } else if (labels.isRelease && branched) {
                emoji = `🚀${branchManagementEmoji}`;
            } else if ((labels.isBugfix || labels.isBug) && branched) {
                emoji = `🐛${branchManagementEmoji}`;
            } else if ((labels.isFeature || labels.isEnhancement) && branched) {
                emoji = `✨${branchManagementEmoji}`;
            } else if ((labels.isDocs || labels.isDocumentation) && branched) {
                emoji = `📝${branchManagementEmoji}`;
            } else if ((labels.isChore || labels.isMaintenance) && branched) {
                emoji = `🔧${branchManagementEmoji}`;
            } else if (labels.isHotfix) {
                emoji = '🔥';
            } else if (labels.isRelease) {
                emoji = '🚀';
            } else if (labels.isBugfix || labels.isBug) {
                emoji = '🐛';
            } else if (labels.isFeature || labels.isEnhancement) {
                emoji = '✨';
            } else if (labels.isDocs || labels.isDocumentation) {
                emoji = '📝';
            } else if (labels.isChore || labels.isMaintenance) {
                emoji = '🔧';
            } else if (labels.isHelp) {
                emoji = '🆘';
            } else if (labels.isQuestion) {
                emoji = '❓';
            }

            const sanitizedTitle = issueTitle
                .replace(/[^\p{L}\p{N}\p{P}\p{Z}^$\n]/gu, '')
                .replace(/\u200D/g, '')
                .replace(/[^\S\r\n]+/g, ' ')
                .replace(/[^a-zA-Z0-9 ]/g, '')
                .replace(/^-+|-+$/g, '')
                .replace(/- -/g, '-').trim()
                .replace(/-+/g, '-')
                .trim();

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

            const sanitizedTitle = issueTitle
                .replace(/[^\p{L}\p{N}\p{P}\p{Z}^$\n]/gu, '')
                .replace(/\u200D/g, '')
                .replace(/[^\S\r\n]+/g, ' ')
                .replace(/[^a-zA-Z0-9 ]/g, '')
                .replace(/^-+|-+$/g, '')
                .replace(/- -/g, '-').trim()
                .replace(/-+/g, '-')
                .trim();

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

    closeIssue = async (
        owner: string,
        repository: string,
        issueNumber: number,
        token: string,
    ) => {
        const octokit = github.getOctokit(token);
        const {data: issue} = await octokit.rest.issues.get({
            owner: owner,
            repo: repository,
            issue_number: issueNumber,
        });

        logDebugInfo(`Issue #${issueNumber} state: ${issue.state}`);

        if (issue.state === 'open') {
            await octokit.rest.issues.update({
                owner: owner,
                repo: repository,
                issue_number: issueNumber,
                state: 'closed',
            });
            logDebugInfo(`Issue #${issueNumber} has been closed.`);
            return true;
        } else {
            logDebugInfo(`Issue #${issueNumber} is already closed.`);
            return false;
        }
    }

    openIssue = async (
        owner: string,
        repository: string,
        issueNumber: number,
        token: string,
    ) => {
        const octokit = github.getOctokit(token);
        const {data: issue} = await octokit.rest.issues.get({
            owner: owner,
            repo: repository,
            issue_number: issueNumber,
        });

        logDebugInfo(`Issue #${issueNumber} state: ${issue.state}`);

        if (issue.state === 'closed') {
            await octokit.rest.issues.update({
                owner: owner,
                repo: repository,
                issue_number: issueNumber,
                state: 'open',
            });
            logDebugInfo(`Issue #${issueNumber} has been re-opened.`);
            return true;
        } else {
            logDebugInfo(`Issue #${issueNumber} is already opened.`);
            return false;
        }
    }

    getCurrentAssignees = async (
        owner: string,
        repository: string,
        issueNumber: number,
        token: string
    ): Promise<string[]> => {
        const octokit = github.getOctokit(token);

        try {
            const {data: issue} = await octokit.rest.issues.get({
                owner,
                repo: repository,
                issue_number: issueNumber,
            });

            const assignees = issue.assignees
            if (assignees === undefined || assignees === null) {
                return [];
            }
            return assignees.map((assignee) => assignee.login);
        } catch (error) {
            logError(`Error getting members of issue: ${error}.`);
            return [];
        }
    };

    assignMembersToIssue = async (
        owner: string,
        repository: string,
        issueNumber: number,
        members: string[],
        token: string
    ): Promise<string[]> => {
        const octokit = github.getOctokit(token);

        try {
            if (members.length === 0) {
                logDebugInfo(`No members provided for assignment. Skipping operation.`);
                return [];
            }

            const {data: updatedIssue} = await octokit.rest.issues.addAssignees({
                owner,
                repo: repository,
                issue_number: issueNumber,
                assignees: members,
            });

            const updatedAssignees = updatedIssue.assignees || [];
            return updatedAssignees.map((assignee) => assignee.login);
        } catch (error) {
            logError(`Error assigning members to issue: ${error}.`);
            return [];
        }
    };

    getIssueDescription = async (
        owner: string,
        repository: string,
        issueNumber: number,
        token: string,
    ): Promise<string> => {
        const octokit = github.getOctokit(token);
        const {data: issue} = await octokit.rest.issues.get({
            owner,
            repo: repository,
            issue_number: issueNumber,
        });
        return issue.body ?? '';
    }


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