import type { GithubClientPort } from "../../../application/ports//github_client_ports";
import type { GithubGraphqlTransportClient } from "../../../application/ports//github_graphql_ports";
import { logDebugInfo, logError } from "../../../utils/logger";
import { ProjectDetail } from "../../model/project_detail";
import type { ProjectBoardCommandPort } from "../../../application/ports/project_board_command_ports";
import type { ProjectBoardContentQueryPort } from "../../../application/ports/project_board_query_ports";

export class ProjectBoardCommandRepository implements ProjectBoardCommandPort {
    private readonly priorityLabel = "Priority";
    private readonly sizeLabel = "Size";
    private readonly statusLabel = "Status";

    constructor(
        private readonly projectBoardContentQueryPort: ProjectBoardContentQueryPort,
        private readonly graphqlClient: GithubClientPort<GithubGraphqlTransportClient>,
    ) {}

    private setSingleSelectFieldValue = async (
        project: ProjectDetail,
        owner: string,
        repo: string,
        issueOrPullRequestNumber: number,
        fieldName: string,
        fieldValue: string,
        token: string
    ): Promise<boolean> => {
        const contentId = await this.projectBoardContentQueryPort.getContentId(project, owner, repo, issueOrPullRequestNumber, token);
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
