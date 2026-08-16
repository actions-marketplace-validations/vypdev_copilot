import type { ProjectDetail } from "../model/project_detail";

export interface RepositoryReleasePort {
    updateTag(
        owner: string,
        repository: string,
        sourceTag: string,
        targetTag: string,
        token: string,
    ): Promise<void>;
    updateRelease(
        owner: string,
        repository: string,
        sourceTag: string,
        targetTag: string,
        token: string,
    ): Promise<string | undefined>;
    createRelease(
        owner: string,
        repository: string,
        version: string,
        title: string,
        changelog: string,
        token: string,
    ): Promise<string | undefined>;
    getDefaultBranch(
        owner: string,
        repository: string,
        token: string,
    ): Promise<string | undefined>;
    createTag(
        owner: string,
        repository: string,
        branch: string,
        tag: string,
        token: string,
    ): Promise<string | undefined>;
}

export interface ProjectBoardQueryPort {
    getProjectDetail(projectId: string, token: string): Promise<ProjectDetail>;
    isContentLinked(project: ProjectDetail, contentId: string, token: string): Promise<boolean>;
}

export interface ProjectBoardLinkPort {
    linkContentId(project: ProjectDetail, contentId: string, token: string): Promise<boolean>;
}

export interface ProjectBoardCommandPort {
    setTaskPriority(
        project: ProjectDetail,
        owner: string,
        repository: string,
        issueOrPullRequestNumber: number,
        priorityLabel: string,
        token: string,
    ): Promise<boolean>;
    setTaskSize(
        project: ProjectDetail,
        owner: string,
        repository: string,
        issueOrPullRequestNumber: number,
        sizeLabel: string,
        token: string,
    ): Promise<boolean>;
    moveIssueToColumn(
        project: ProjectDetail,
        owner: string,
        repository: string,
        issueOrPullRequestNumber: number,
        columnName: string,
        token: string,
    ): Promise<boolean>;
}
