import type { GithubClientPort, GithubGraphqlClient, GithubProjectClient } from "../../../data/repository/github/github_client_port";
import { logDebugInfo, logError } from "../../../utils/logger";
import { paginateCursor } from "../github/github_pagination_adapter";
import { ProjectResult } from "../../graph/project_result";
import { ProjectDetail } from "../../model/project_detail";
import type { ProjectBoardCommandPort, ProjectBoardLinkPort, ProjectBoardQueryPort } from "../../../application/ports/project_board_ports";

/** GitHub Projects V2 adapter for project loading, content lookup, and linking. */
export class ProjectBoardRepository implements ProjectBoardCommandPort, ProjectBoardQueryPort, ProjectBoardLinkPort {
    constructor(
        private readonly projectClient: GithubClientPort<GithubProjectClient>,
        private readonly graphqlClient: GithubClientPort<GithubGraphqlClient>,
    ) {}

    private readonly priorityLabel = "Priority";
    private readonly sizeLabel = "Size";
    private readonly statusLabel = "Status";

    /**
     * Retrieves detailed information about a GitHub project
     * @param projectId - The project number/ID
     * @param token - GitHub authentication token
     * @returns Promise<ProjectDetail> - The project details
     * @throws {Error} If the project is not found or if there are authentication/network issues
     */
    getProjectDetail = async (projectId: string, token: string): Promise<ProjectDetail> => {
        try {
            const projectNumber = parseInt(projectId, 10);
            if (isNaN(projectNumber)) {
                throw new Error(`Invalid project ID: ${projectId}. Must be a valid number.`);
            }
            const projectOctokit = this.projectClient.getClient(token);
            const { data: owner } = await projectOctokit.rest.users.getByUsername({ username: this.projectClient.getClient(token).context.repo.owner }).catch((error: unknown) => {
                throw new Error(`Failed to get owner information: ${error instanceof Error ? error.message : String(error)}`);
            });
            const ownerType = owner.type === 'Organization' ? 'orgs' : 'users';
            const projectUrl = `https://github.com/${ownerType}/${this.projectClient.getClient(token).context.repo.owner}/projects/${projectId}`;
            const ownerQueryField = ownerType === 'orgs' ? 'organization' : 'user';
            const queryProject = `
                query($ownerName: String!, $projectNumber: Int!) {
                    ${ownerQueryField}(login: $ownerName) {
                        projectV2(number: $projectNumber) { id title url }
                    }
                }
            `;
            const projectResult = await this.graphqlClient.getClient(token).graphql<ProjectResult>(queryProject, {
                ownerName: this.projectClient.getClient(token).context.repo.owner,
                projectNumber,
            }).catch(error => {
                throw new Error(`Failed to fetch project data: ${error.message}`);
            });
            const projectData = projectResult[ownerQueryField]?.projectV2;
            if (!projectData) throw new Error(`Project not found: ${projectUrl}`);
            logDebugInfo(`Project ID: ${projectData.id}`);
            logDebugInfo(`Project Title: ${projectData.title}`);
            logDebugInfo(`Project URL: ${projectData.url}`);
            return new ProjectDetail({ id: projectData.id, title: projectData.title, url: projectData.url, type: ownerQueryField, owner: this.projectClient.getClient(token).context.repo.owner, number: projectNumber });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            logError(`Error in getProjectDetail: ${errorMessage}`);
            throw error;
        }
    };

    getContentId = async (project: ProjectDetail, owner: string, repo: string, issueOrPullRequestNumber: number, token: string): Promise<string | undefined> => {
        const issueOrPrQuery = `query($owner: String!, $repo: String!, $number: Int!) { repository(owner: $owner, name: $repo) { issueOrPullRequest: issueOrPullRequest(number: $number) { ... on Issue { id } ... on PullRequest { id } } } }`;
        const issueOrPrResult = await this.graphqlClient.getClient(token).graphql<{ repository: { issueOrPullRequest?: { id: string } } }>(issueOrPrQuery, { owner, repo, number: issueOrPullRequestNumber });
        if (!issueOrPrResult.repository.issueOrPullRequest) {
            logError(`Issue or PR #${issueOrPullRequestNumber} not found in repository.`);
            return undefined;
        }
        const contentId = issueOrPrResult.repository.issueOrPullRequest.id;
        let cursor: string | null = null;
        let projectItemId: string | undefined;
        let totalItemsChecked = 0;
        const maxPages = 100;
        let pageCount = 0;
        do {
            if (pageCount >= maxPages) {
                logError(`Stopped after ${maxPages} pages (${totalItemsChecked} items). Issue or PR #${issueOrPullRequestNumber} not found in project.`);
                break;
            }
            pageCount += 1;
            const projectQuery = `query($projectId: ID!, $cursor: String) { node(id: $projectId) { ... on ProjectV2 { items(first: 100, after: $cursor) { pageInfo { hasNextPage endCursor } nodes { id content { ... on Issue { id } ... on PullRequest { id } } } } } } }`;
            type ProjectItemsResponse = { node: { items?: { nodes: Array<{ id: string; content?: { id?: string } }>; pageInfo: { hasNextPage: boolean; endCursor: string | null } } } | null };
            const projectResult: ProjectItemsResponse = await this.graphqlClient.getClient(token).graphql<ProjectItemsResponse>(projectQuery, { projectId: project.id, cursor });
            if (projectResult.node === null) {
                logError(`Project not found for ID "${project.id}". Ensure the project is loaded via getProjectDetail (GraphQL node ID), not the project number.`);
                throw new Error(`Project not found or invalid project ID. The project ID must be the GraphQL node ID from the API (e.g. PVT_...), not the project number.`);
            }
            const items = projectResult.node.items?.nodes ?? [];
            totalItemsChecked += items.length;
            const foundItem: { id: string; content?: { id?: string } } | undefined = items.find((item: { id: string; content?: { id?: string } }) => item.content?.id === contentId);
            if (foundItem) { projectItemId = foundItem.id; break; }
            const hasNextPage = projectResult.node.items?.pageInfo.hasNextPage === true;
            const endCursor: string | null = projectResult.node.items?.pageInfo.endCursor ?? null;
            if (hasNextPage && endCursor) cursor = endCursor;
            else { if (hasNextPage) logError(`Project items pagination: hasNextPage is true but endCursor is null (page ${pageCount}, ${totalItemsChecked} items so far). Cannot fetch more.`); cursor = null; }
        } while (cursor);
        if (projectItemId === undefined) {
            logError(`Issue or PR #${issueOrPullRequestNumber} not found in project after checking ${totalItemsChecked} items (${pageCount} page(s)). Link it to the project first, or wait for the board to sync.`);
            throw new Error(`Issue or pull request #${issueOrPullRequestNumber} is not in the project yet (checked ${totalItemsChecked} items). Link it to the project first, or wait for the board to sync.`);
        }
        return projectItemId;
    };

    isContentLinked = async (project: ProjectDetail, contentId: string, token: string): Promise<boolean> => {
        const query = `query($projectId: ID!, $after: String) { node(id: $projectId) { ... on ProjectV2 { items(first: 100, after: $after) { nodes { content { ... on PullRequest { id } ... on Issue { id } } } pageInfo { hasNextPage endCursor } } } } }`;
        const allItems: Array<{ content?: { id?: string } }> = [];
        for await (const page of paginateCursor(async cursor => {
            const result = await this.graphqlClient.getClient(token).graphql<{ node: { items: { nodes: Array<{ content?: { id?: string } }>; pageInfo: { hasNextPage: boolean; endCursor: string | null } } } }>(query, { projectId: project.id, after: cursor });
            return result.node.items;
        }, { description: `Project ${project.id} items pagination` })) allItems.push(...page.nodes);
        return allItems.some(item => item.content?.id === contentId);
    };

    linkContentId = async (project: ProjectDetail, contentId: string, token: string): Promise<boolean> => {
        if (await this.isContentLinked(project, contentId, token)) {
            logDebugInfo(`Content ${contentId} is already linked to project ${project.id}.`);
            return false;
        }
        const linkMutation = `mutation($projectId: ID!, $contentId: ID!) { addProjectV2ItemById(input: {projectId: $projectId, contentId: $contentId}) { item { id } } }`;
        const linkResult = await this.graphqlClient.getClient(token).graphql<{ addProjectV2ItemById?: { item?: { id: string } } }>(linkMutation, { projectId: project.id, contentId });
        logDebugInfo(`Linked ${contentId} with id ${linkResult.addProjectV2ItemById?.item?.id ?? ''} to project ${project.id}`);
        return true;
    };
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
        const initialFieldResult = await this.graphqlClient.getClient(token).graphql<FieldResult>(fieldQuery, {
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
            const fieldResult: FieldResult = await this.graphqlClient.getClient(token).graphql<FieldResult>(fieldQuery, {
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

        const mutationResult = await this.graphqlClient.getClient(token).graphql<{ updateProjectV2ItemFieldValue?: { projectV2Item?: { id: string } } }>(mutation, {
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

}
