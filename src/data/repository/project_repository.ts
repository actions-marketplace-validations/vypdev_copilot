import * as github from "@actions/github";
import { logDebugInfo, logError } from '../../utils/logger';
import { ProjectDetail } from "../model/project_detail";
import { authorizationForFileModification } from './actor_modification_policy';
import { collectOrganizationMembers, selectAvailableMembers } from './project_members_policy';
import { RepositoryReleaseRepository } from './repository_release_repository';
import { ProjectBoardRepository } from './project_board_repository';

export class ProjectRepository {
    private readonly releaseRepository = new RepositoryReleaseRepository();
    private readonly projectBoardRepository = new ProjectBoardRepository();
  
    private readonly priorityLabel = "Priority"  
    private readonly sizeLabel = "Size"
    private readonly statusLabel = "Status"
    
    getProjectDetail = this.projectBoardRepository.getProjectDetail;

    getContentId = this.projectBoardRepository.getContentId;

    isContentLinked = this.projectBoardRepository.isContentLinked;

    linkContentId = this.projectBoardRepository.linkContentId;

    private setSingleSelectFieldValue = async (
        project: ProjectDetail,
        owner: string,
        repo: string,
        issueOrPullRequestNumber: number,
        fieldName: string,
        fieldValue: string,
        token: string
    ): Promise<boolean> => {
        const contentId = await this.getContentId(project, owner, repo, issueOrPullRequestNumber, token);
        if (!contentId) {
            logError(`Content ID not found for issue or pull request #${issueOrPullRequestNumber}.`);
            throw new Error(`Content ID not found for issue or pull request #${issueOrPullRequestNumber}.`);
        }

        logDebugInfo(`Content ID: ${contentId}`);

        const octokit = github.getOctokit(token);

        // Get the field ID and current value
        const fieldQuery = `
        query($projectId: ID!, $after: String) {
          node(id: $projectId) {
            ... on ProjectV2 {
              fields(first: 20) {
                nodes { 
                  ... on ProjectV2SingleSelectField {
                    id
                    name
                    options {
                      id
                      name  
                    }
                  }
                }
              }
              items(first: 100, after: $after) {
                pageInfo {
                  hasNextPage
                  endCursor
                }
                nodes {
                  id
                  fieldValues(first: 20) {
                    nodes {
                      ... on ProjectV2ItemFieldSingleSelectValue {
                        field {
                          ... on ProjectV2SingleSelectField {
                            name
                          }
                        }
                        optionId
                      }
                    }
                  }
                }
              }
            }
          }         
        }`;

        let hasNextPage = true;
        let endCursor: string | null = null;
        interface FieldNode { id: string; name: string; options?: Array<{ id: string; name: string }> }
        interface ItemNode { id: string; fieldValues?: { nodes: Array<{ field?: { name: string }; optionId?: string }> } }
        type FieldResult = { node: { fields: { nodes: FieldNode[] }; items: { nodes: ItemNode[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } } } };
        let currentItem: ItemNode | null = null;

        // Get the field and option information from the first page
        const initialFieldResult = await octokit.graphql<FieldResult>(fieldQuery, { 
            projectId: project.id,
            after: null
        });

        const targetField = initialFieldResult.node.fields.nodes.find(
            (f: FieldNode) => f.name === fieldName
        );

        logDebugInfo(`Target field: ${JSON.stringify(targetField, null, 2)}`);

        if (!targetField) {
            logError(`Field '${fieldName}' not found or is not a single-select field.`);
            throw new Error(`Field '${fieldName}' not found or is not a single-select field.`);
        }

        const targetOption = targetField.options?.find(
            (opt: { id: string; name: string }) => opt.name === fieldValue
        );

        logDebugInfo(`Target option: ${JSON.stringify(targetOption, null, 2)}`);

        if (!targetOption) {
            logError(`Option '${fieldValue}' not found for field '${fieldName}'.`);
            throw new Error(`Option '${fieldValue}' not found for field '${fieldName}'.`);
        }

        // Now search for the item through all pages
        while (hasNextPage) {
            const fieldResult: FieldResult = await octokit.graphql<FieldResult>(fieldQuery, { 
                projectId: project.id,
                after: endCursor
            });

            // logDebugInfo(`Field result: ${JSON.stringify(fieldResult, null, 2)}`);

            // Check current value in current page
            currentItem = fieldResult.node.items.nodes.find((item: ItemNode) => item.id === contentId) ?? null;
            if (currentItem) {
                // logDebugInfo(`Current item: ${JSON.stringify(currentItem, null, 2)}`);
                const currentFieldValue = currentItem.fieldValues?.nodes.find(
                    (value: { field?: { name: string }; optionId?: string }) => value.field?.name === fieldName
                );
                
                if (currentFieldValue && currentFieldValue.optionId === targetOption.id) {
                    logDebugInfo(`Field '${fieldName}' is already set to '${fieldValue}'. No update needed.`);
                    return false;
                }
                break; // Found the item, no need to continue pagination
            }

            hasNextPage = fieldResult.node.items.pageInfo.hasNextPage;
            endCursor = fieldResult.node.items.pageInfo.endCursor;
        }

        logDebugInfo(`Target field ID: ${targetField.id}`);
        logDebugInfo(`Target option ID: ${targetOption.id}`);

        const mutation = `
        mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
          updateProjectV2ItemFieldValue(  
            input: {
              projectId: $projectId,
              itemId: $itemId,
              fieldId: $fieldId,
              value: { singleSelectOptionId: $optionId }
            }
          ) {
            projectV2Item {
              id
            }
          }
        }`;

        const mutationResult = await octokit.graphql<{ updateProjectV2ItemFieldValue?: { projectV2Item?: { id: string } } }>(mutation, {
            projectId: project.id,
            itemId: contentId,
            fieldId: targetField.id,
            optionId: targetOption.id
        });

        return !!mutationResult.updateProjectV2ItemFieldValue?.projectV2Item;
    };

    setTaskPriority = async (
        project: ProjectDetail,
        owner: string,
        repo: string,
        issueOrPullRequestNumber: number,
        priorityLabel: string,
        token: string
    ): Promise<boolean> => this.setSingleSelectFieldValue(
        project,
        owner,
        repo,
        issueOrPullRequestNumber,
        this.priorityLabel,
        priorityLabel,
        token
    );

    setTaskSize = async (
        project: ProjectDetail,
        owner: string,
        repo: string,
        issueOrPullRequestNumber: number,
        sizeLabel: string,
        token: string
    ): Promise<boolean> => this.setSingleSelectFieldValue(
        project,
        owner,
        repo,
        issueOrPullRequestNumber,
        this.sizeLabel,
        sizeLabel,
        token
    );

    moveIssueToColumn = async (
        project: ProjectDetail,
        owner: string,
        repo: string,
        issueOrPullRequestNumber: number,
        columnName: string,
        token: string
    ): Promise<boolean> => this.setSingleSelectFieldValue(
        project,
        owner,
        repo,
        issueOrPullRequestNumber,
        this.statusLabel,
        columnName,
        token
    );

    getRandomMembers = async (
        organization: string,
        membersToAdd: number,
        currentMembers: string[],
        token: string
    ): Promise<string[]> => {
        if (membersToAdd === 0) {
            return [];
        }

        const octokit = github.getOctokit(token);

        try {
            const {data: teams} = await octokit.rest.teams.list({
                org: organization,
            });

            if (teams.length === 0) {
                logDebugInfo(`${organization} doesn't have any team.`);
                return [];
            }

            const allMembers = await collectOrganizationMembers(
                teams,
                async (teamSlug) => {
                    const {data: members} = await octokit.rest.teams.listMembersInOrg({
                        org: organization,
                        team_slug: teamSlug,
                    });
                    return members;
                },
            );
            const selectedMembers = selectAvailableMembers(allMembers, currentMembers, membersToAdd);

            if (selectedMembers.length === 0) {
                logDebugInfo(`No available members to assign for organization ${organization}.`);
            }
            return selectedMembers;
        } catch (error) {
            logError(`Error getting random members: ${error}.`);
        }
        return [];
    };

    getAllMembers = async (
        organization: string,
        token: string
    ): Promise<string[]> => {
        const octokit = github.getOctokit(token);

        try {
            const {data: teams} = await octokit.rest.teams.list({
                org: organization,
            });

            if (teams.length === 0) {
                logDebugInfo(`${organization} doesn't have any team.`);
                return [];
            }

            return await collectOrganizationMembers(
                teams,
                async (teamSlug) => {
                    const {data: members} = await octokit.rest.teams.listMembersInOrg({
                        org: organization,
                        team_slug: teamSlug,
                    });
                    return members;
                },
            );
        } catch (error) {
            logError(`Error getting all members: ${error}.`);
        }
        return [];
    };

    getUserFromToken = async (token: string): Promise<string> => {
        const octokit = github.getOctokit(token);
        const {data: user} = await octokit.rest.users.getAuthenticated();
        return user.login;
    };

    /**
     * Returns true if the actor (user who triggered the event) is allowed to run use cases
     * that ask OpenCode to modify files (e.g. bugbot autofix, generic user request).
     * - When the repo owner is an Organization: actor must be a member of that organization.
     * - When the repo owner is a User: actor must be the owner (same login).
     */
    isActorAllowedToModifyFiles = async (
        owner: string,
        actor: string,
        token: string
    ): Promise<boolean> => {
        try {
            const octokit = github.getOctokit(token);
            const { data: ownerUser } = await octokit.rest.users.getByUsername({ username: owner });
            const authorization = authorizationForFileModification(owner, actor, ownerUser.type);
            if (authorization.kind === 'owner') {
                return authorization.allowed;
            }

            try {
                await octokit.rest.orgs.checkMembershipForUser({
                    org: authorization.organization,
                    username: authorization.actor,
                });
                return true;
            } catch (membershipErr: unknown) {
                const status = (membershipErr as { status?: number })?.status;
                if (status === 404) return false;
                logDebugInfo(`checkMembershipForUser(${owner}, ${actor}): ${membershipErr instanceof Error ? membershipErr.message : String(membershipErr)}`);
                return false;
            }
        } catch (err) {
            logDebugInfo(`isActorAllowedToModifyFiles(${owner}, ${actor}): ${err instanceof Error ? err.message : String(err)}`);
            return false;
        }
    };

    /** Name and email of the token user, for git commit author (e.g. bugbot autofix). */
    getTokenUserDetails = async (token: string): Promise<{ name: string; email: string }> => {
        const octokit = github.getOctokit(token);
        const { data: user } = await octokit.rest.users.getAuthenticated();
        const name = (user.name ?? user.login ?? "GitHub Action").trim() || "GitHub Action";
        const email =
            (typeof user.email === "string" && user.email.trim().length > 0)
                ? user.email.trim()
                : `${user.login}@users.noreply.github.com`;
        return { name, email };
    };

    updateTag = this.releaseRepository.updateTag;

    updateRelease = this.releaseRepository.updateRelease;

    createRelease = this.releaseRepository.createRelease;

    getDefaultBranch = this.releaseRepository.getDefaultBranch;

    createTag = this.releaseRepository.createTag;
}
