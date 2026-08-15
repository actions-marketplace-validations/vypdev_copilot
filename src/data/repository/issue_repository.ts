import * as core from "@actions/core";
import * as github from "@actions/github";
import { logDebugInfo, logError } from "../../utils/logger";
import { IssueContentRepository } from './issue_content_repository';
import { IssueMetadataRepository } from './issue_metadata_repository';
import { IssueLabelRepository } from './issue_label_repository';
import { IssueProgressLabelRepository } from './issue_progress_label_repository';
import { IssueLabelProvisioningRepository } from './issue_label_provisioning_repository';
import { Labels } from "../model/labels";
import { IssueTypes } from "../model/issue_types";

export { PROGRESS_LABEL_PATTERN } from './progress_labels';

export class IssueRepository {
    private readonly issueContentRepository = new IssueContentRepository();
    private readonly issueMetadataRepository = new IssueMetadataRepository();
    private readonly issueLabelRepository = new IssueLabelRepository();
    private readonly issueProgressLabelRepository = new IssueProgressLabelRepository(this.issueLabelRepository);
    private readonly issueLabelProvisioningRepository = new IssueLabelProvisioningRepository();

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

    setIssueType = async (
        owner: string,
        repository: string,
        issueNumber: number,
        labels: Labels,
        issueTypes: IssueTypes,
        token: string,
    ): Promise<void> => {
        try {
            let issueType = issueTypes.task
            let issueTypeDescription = issueTypes.taskDescription
            let issueTypeColor = issueTypes.taskColor
            if (labels.isHotfix) {
                issueType = issueTypes.hotfix;
                issueTypeDescription = issueTypes.hotfixDescription;
                issueTypeColor = issueTypes.hotfixColor;
            } else if (labels.isRelease) {
                issueType = issueTypes.release;
                issueTypeDescription = issueTypes.releaseDescription;
                issueTypeColor = issueTypes.releaseColor;
            } else if ((labels.isDocs || labels.isDocumentation)) {
                issueType = issueTypes.documentation;
                issueTypeDescription = issueTypes.documentationDescription;
                issueTypeColor = issueTypes.documentationColor;
            } else if (labels.isChore || labels.isMaintenance) {
                issueType = issueTypes.maintenance;
                issueTypeDescription = issueTypes.maintenanceDescription;
                issueTypeColor = issueTypes.maintenanceColor;
            } else if (labels.isBugfix || labels.isBug) {
                issueType = issueTypes.bug;
                issueTypeDescription = issueTypes.bugDescription;
                issueTypeColor = issueTypes.bugColor;
            } else if (labels.isFeature || labels.isEnhancement) {
                issueType = issueTypes.feature;
                issueTypeDescription = issueTypes.featureDescription;
                issueTypeColor = issueTypes.featureColor;
            } else if (labels.isHelp) {
                issueType = issueTypes.help;
                issueTypeDescription = issueTypes.helpDescription;
                issueTypeColor = issueTypes.helpColor;
            } else if (labels.isQuestion) {
                issueType = issueTypes.question;
                issueTypeDescription = issueTypes.questionDescription;
                issueTypeColor = issueTypes.questionColor;
            }

            const octokit = github.getOctokit(token);
            logDebugInfo(`Setting issue type for issue ${issueNumber} to ${issueType}`);
            logDebugInfo(`Creating new issue type "${issueType}" for organization ${owner}...`);
            logDebugInfo(`Issue Type: ${issueType}`);
            logDebugInfo(`Issue Type Description: ${issueTypeDescription}`);
            logDebugInfo(`Issue Type Color: ${issueTypeColor}`);

            // Try to update the issue with the issue type using GraphQL
            const issueId = await this.getId(owner, repository, issueNumber, token);
            
            // First, try to find existing issue types in the organization
            const { organization } = await octokit.graphql<{ 
                organization: { 
                    id: string, 
                    issueTypes: { 
                        nodes: { id: string, name: string }[] 
                    } 
                } 
            }>(`
                query ($owner: String!) {
                    organization(login: $owner) {
                        id
                        issueTypes(first: 20) {
                            nodes {
                                id
                                name
                            }
                        }
                    }
                }
            `, { owner });

            logDebugInfo(`Organization ID: ${organization.id}`);
            logDebugInfo(`Organization issue types: ${JSON.stringify(organization.issueTypes.nodes)}`);

            // Check if the issue type already exists
            const existingType = organization.issueTypes.nodes.find((type: { name: string }) => 
                type.name.toLowerCase() === issueType.toLowerCase()
            );

            let issueTypeId;
            if (existingType) {
                issueTypeId = existingType.id;
                logDebugInfo(`Found existing issue type "${issueType}" with ID: ${issueTypeId}`);
            } else {
                // Try to create the issue type using GraphQL
                
                try {
                    logDebugInfo(`Creating new issue type "${issueType}" for organization ${owner}...`);
                    
                    const createResult = await octokit.graphql<{ 
                        createIssueType: { 
                            issueType: { id: string } 
                        } 
                    }>(`
                        mutation ($ownerId: ID!, $name: String!, $description: String!, $color: IssueTypeColor!, $isEnabled: Boolean!) {
                            createIssueType(input: {
                                ownerId: $ownerId, 
                                name: $name,
                                description: $description,
                                color: $color,
                                isEnabled: $isEnabled
                            }) {
                                issueType {
                                    id
                                }
                            }
                        }
                    `, { 
                        ownerId: organization.id, 
                        name: issueType,
                        description: issueTypeDescription,
                        color: issueTypeColor.toUpperCase(),
                        isEnabled: true,
                    });
                    
                    issueTypeId = createResult.createIssueType.issueType.id;
                    logDebugInfo(`Created new issue type "${issueType}" with ID: ${issueTypeId}`);
                } catch (createError) {
                    logError(`Failed to create issue type "${issueType}": ${createError}`);
                    // If creation fails, we'll fall back to using labels
                    logDebugInfo(`Falling back to using labels for issue type classification`);
                    return;
                }
            }

            // Update the issue with the issue type using GraphQL
            await octokit.graphql(`
                mutation ($issueId: ID!, $issueTypeId: ID!) {
                    updateIssueIssueType(input: {
                        issueId: $issueId, 
                        issueTypeId: $issueTypeId
                    }) {
                        issue {
                            id
                            issueType {
                                id
                                name
                            }
                        }
                    }
                }
            `, {
                issueId,
                issueTypeId,
            });

            logDebugInfo(`Successfully updated issue type to ${issueType}`);
        } catch (error) {
            logError(`Failed to update issue type: ${error}`);
            // Don't throw the error to prevent breaking the main flow
            // The issue will still be processed with labels
            logDebugInfo(`Continuing with issue processing despite issue type update failure`);
            throw error;
        }
    }

    listLabelsForRepo = this.issueLabelProvisioningRepository.listLabelsForRepo;

    createLabel = this.issueLabelProvisioningRepository.createLabel;

    ensureLabel = this.issueLabelProvisioningRepository.ensureLabel;

    ensureLabels = this.issueLabelProvisioningRepository.ensureLabels;

    /**
     * List all issue types for an organization
     */
    listIssueTypes = async (
        owner: string,
        token: string,
    ): Promise<Array<{ id: string; name: string }>> => {
        const octokit = github.getOctokit(token);
        const { organization } = await octokit.graphql<{
            organization: {
                id: string;
                issueTypes: {
                    nodes: { id: string; name: string }[];
                };
            };
        }>(`
            query ($owner: String!) {
                organization(login: $owner) {
                    id
                    issueTypes(first: 20) {
                        nodes {
                            id
                            name
                        }
                    }
                }
            }
        `, { owner });

        if (!organization) {
            throw new Error(`No se pudo obtener la organización ${owner}`);
        }

        return organization.issueTypes.nodes;
    }

    /**
     * Create an issue type for an organization
     */
    createIssueType = async (
        owner: string,
        name: string,
        description: string,
        color: string,
        token: string,
    ): Promise<string> => {
        const octokit = github.getOctokit(token);
        
        // Get organization ID
        const { organization } = await octokit.graphql<{
            organization: {
                id: string;
            };
        }>(`
            query ($owner: String!) {
                organization(login: $owner) {
                    id
                }
            }
        `, { owner });

        if (!organization) {
            throw new Error(`No se pudo obtener la organización ${owner}`);
        }

        const createResult = await octokit.graphql<{
            createIssueType: {
                issueType: { id: string };
            };
        }>(`
            mutation ($ownerId: ID!, $name: String!, $description: String!, $color: IssueTypeColor!, $isEnabled: Boolean!) {
                createIssueType(input: {
                    ownerId: $ownerId,
                    name: $name,
                    description: $description,
                    color: $color,
                    isEnabled: $isEnabled
                }) {
                    issueType {
                        id
                    }
                }
            }
        `, {
            ownerId: organization.id,
            name,
            description,
            color: color.toUpperCase(),
            isEnabled: true,
        });

        return createResult.createIssueType.issueType.id;
    }

    /**
     * Ensure an issue type exists, creating it if it doesn't
     */
    ensureIssueType = async (
        owner: string,
        name: string,
        description: string,
        color: string,
        token: string,
    ): Promise<{ created: boolean; existed: boolean }> => {
        try {
            const existingTypes = await this.listIssueTypes(owner, token);
            const existingTypesMap = new Map(
                existingTypes.map(type => [type.name.toLowerCase(), type])
            );

            if (existingTypesMap.has(name.toLowerCase())) {
                return { created: false, existed: true };
            }

            await this.createIssueType(owner, name, description, color, token);
            return { created: true, existed: false };
        } catch (error) {
            logError(`Error ensuring issue type "${name}": ${error}`);
            throw error;
        }
    }

    /**
     * Ensure all required issue types exist based on IssueTypes configuration
     */
    ensureIssueTypes = async (
        owner: string,
        issueTypes: IssueTypes,
        token: string,
    ): Promise<{ created: number; existing: number; errors: string[] }> => {
        const errors: string[] = [];
        let created = 0;
        let existing = 0;

        // Define all required issue types
        const requiredIssueTypes = [
            { name: issueTypes.task, description: issueTypes.taskDescription, color: issueTypes.taskColor },
            { name: issueTypes.bug, description: issueTypes.bugDescription, color: issueTypes.bugColor },
            { name: issueTypes.feature, description: issueTypes.featureDescription, color: issueTypes.featureColor },
            { name: issueTypes.documentation, description: issueTypes.documentationDescription, color: issueTypes.documentationColor },
            { name: issueTypes.maintenance, description: issueTypes.maintenanceDescription, color: issueTypes.maintenanceColor },
            { name: issueTypes.hotfix, description: issueTypes.hotfixDescription, color: issueTypes.hotfixColor },
            { name: issueTypes.release, description: issueTypes.releaseDescription, color: issueTypes.releaseColor },
            { name: issueTypes.question, description: issueTypes.questionDescription, color: issueTypes.questionColor },
            { name: issueTypes.help, description: issueTypes.helpDescription, color: issueTypes.helpColor },
        ];

        for (const issueType of requiredIssueTypes) {
            try {
                const result = await this.ensureIssueType(owner, issueType.name, issueType.description, issueType.color, token);
                if (result.created) {
                    created++;
                } else {
                    existing++;
                }
            } catch (error: unknown) {
                const err = error as { message?: string };
                logError(`Error ensuring issue type "${issueType.name}": ${error}`);
                errors.push(`Error creando tipo de Issue "${issueType.name}": ${err.message || error}`);
            }
        }

        return { created, existing, errors };
    }
}
