import type { ProjectDetail } from "../../data/model/project_detail";

export interface ProjectDetailQueryPort {
    getProjectDetail(projectId: string, token: string): Promise<ProjectDetail>;
}

export interface ProjectBoardContentQueryPort {
    getContentId(project: ProjectDetail, owner: string, repository: string, issueOrPullRequestNumber: number, token: string): Promise<string | undefined>;
}

export interface ProjectBoardQueryPort extends ProjectDetailQueryPort {
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
