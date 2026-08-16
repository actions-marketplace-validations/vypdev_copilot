import * as github from "@actions/github";
import { logDebugInfo, logError } from '../../utils/logger';
import { paginateCursor } from "./cursor_pagination";
import { ProjectResult } from "../graph/project_result";
import { ProjectDetail } from "../model/project_detail";
import type { ProjectBoardLinkPort, ProjectBoardQueryPort } from "./github_repository_ports";

/** GitHub Projects V2 adapter for project loading, content lookup, and linking. */
export class ProjectBoardRepository implements ProjectBoardQueryPort, ProjectBoardLinkPort {
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
            const octokit = github.getOctokit(token);
            const { data: owner } = await octokit.rest.users.getByUsername({ username: github.context.repo.owner }).catch(error => {
                throw new Error(`Failed to get owner information: ${error.message}`);
            });
            const ownerType = owner.type === 'Organization' ? 'orgs' : 'users';
            const projectUrl = `https://github.com/${ownerType}/${github.context.repo.owner}/projects/${projectId}`;
            const ownerQueryField = ownerType === 'orgs' ? 'organization' : 'user';
            const queryProject = `
                query($ownerName: String!, $projectNumber: Int!) {
                    ${ownerQueryField}(login: $ownerName) {
                        projectV2(number: $projectNumber) { id title url }
                    }
                }
            `;
            const projectResult = await octokit.graphql<ProjectResult>(queryProject, {
                ownerName: github.context.repo.owner,
                projectNumber,
            }).catch(error => {
                throw new Error(`Failed to fetch project data: ${error.message}`);
            });
            const projectData = projectResult[ownerQueryField]?.projectV2;
            if (!projectData) throw new Error(`Project not found: ${projectUrl}`);
            logDebugInfo(`Project ID: ${projectData.id}`);
            logDebugInfo(`Project Title: ${projectData.title}`);
            logDebugInfo(`Project URL: ${projectData.url}`);
            return new ProjectDetail({ id: projectData.id, title: projectData.title, url: projectData.url, type: ownerQueryField, owner: github.context.repo.owner, number: projectNumber });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            logError(`Error in getProjectDetail: ${errorMessage}`);
            throw error;
        }
    };

    getContentId = async (project: ProjectDetail, owner: string, repo: string, issueOrPullRequestNumber: number, token: string): Promise<string | undefined> => {
        const octokit = github.getOctokit(token);
        const issueOrPrQuery = `query($owner: String!, $repo: String!, $number: Int!) { repository(owner: $owner, name: $repo) { issueOrPullRequest: issueOrPullRequest(number: $number) { ... on Issue { id } ... on PullRequest { id } } } }`;
        const issueOrPrResult = await octokit.graphql<{ repository: { issueOrPullRequest?: { id: string } } }>(issueOrPrQuery, { owner, repo, number: issueOrPullRequestNumber });
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
            const projectResult: ProjectItemsResponse = await octokit.graphql<ProjectItemsResponse>(projectQuery, { projectId: project.id, cursor });
            if (projectResult.node === null) throw new Error(`Project not found or invalid project ID. The project ID must be the GraphQL node ID from the API (e.g. PVT_...), not the project number.`);
            const items = projectResult.node.items?.nodes ?? [];
            totalItemsChecked += items.length;
            const foundItem: { id: string; content?: { id?: string } } | undefined = items.find((item: { id: string; content?: { id?: string } }) => item.content?.id === contentId);
            if (foundItem) { projectItemId = foundItem.id; break; }
            const hasNextPage = projectResult.node.items?.pageInfo.hasNextPage === true;
            const endCursor: string | null = projectResult.node.items?.pageInfo.endCursor ?? null;
            if (hasNextPage && endCursor) cursor = endCursor;
            else { if (hasNextPage) logError(`Project items pagination: hasNextPage is true but endCursor is null (page ${pageCount}, ${totalItemsChecked} items so far). Cannot fetch more.`); cursor = null; }
        } while (cursor);
        if (projectItemId === undefined) throw new Error(`Issue or pull request #${issueOrPullRequestNumber} is not in the project yet (checked ${totalItemsChecked} items). Link it to the project first, or wait for the board to sync.`);
        return projectItemId;
    };

    isContentLinked = async (project: ProjectDetail, contentId: string, token: string): Promise<boolean> => {
        const octokit = github.getOctokit(token);
        const query = `query($projectId: ID!, $after: String) { node(id: $projectId) { ... on ProjectV2 { items(first: 100, after: $after) { nodes { content { ... on PullRequest { id } ... on Issue { id } } } pageInfo { hasNextPage endCursor } } } } }`;
        const allItems: Array<{ content?: { id?: string } }> = [];
        for await (const page of paginateCursor(async cursor => {
            const result = await octokit.graphql<{ node: { items: { nodes: Array<{ content?: { id?: string } }>; pageInfo: { hasNextPage: boolean; endCursor: string | null } } } }>(query, { projectId: project.id, after: cursor });
            return result.node.items;
        }, { description: `Project ${project.id} items pagination` })) allItems.push(...page.nodes);
        return allItems.some(item => item.content?.id === contentId);
    };

    linkContentId = async (project: ProjectDetail, contentId: string, token: string): Promise<boolean> => {
        if (await this.isContentLinked(project, contentId, token)) {
            logDebugInfo(`Content ${contentId} is already linked to project ${project.id}.`);
            return false;
        }
        const octokit = github.getOctokit(token);
        const linkMutation = `mutation($projectId: ID!, $contentId: ID!) { addProjectV2ItemById(input: {projectId: $projectId, contentId: $contentId}) { item { id } } }`;
        const linkResult = await octokit.graphql<{ addProjectV2ItemById?: { item?: { id: string } } }>(linkMutation, { projectId: project.id, contentId });
        logDebugInfo(`Linked ${contentId} with id ${linkResult.addProjectV2ItemById?.item?.id ?? ''} to project ${project.id}`);
        return true;
    };
}
