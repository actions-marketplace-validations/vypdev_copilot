export interface BugbotPullRequestReviewComment {
    id: number;
    body: string | null;
    path?: string;
    line?: number;
    node_id?: string;
}

export interface BugbotPullRequestQueryPort {
    getHeadBranchForIssue(owner: string, repository: string, issueNumber: number, token: string): Promise<string | undefined>;
    getPullRequestReviewCommentBody(owner: string, repository: string, pullNumber: number, commentId: number, token: string): Promise<string | null>;
}

export interface BugbotPullRequestReadPort extends BugbotPullRequestQueryPort {
    getOpenPullRequestNumbersByHeadBranch(owner: string, repository: string, branch: string, token: string): Promise<number[]>;
    listPullRequestReviewComments(owner: string, repository: string, pullNumber: number, token: string): Promise<BugbotPullRequestReviewComment[]>;
    getPullRequestHeadSha(owner: string, repository: string, pullNumber: number, token: string): Promise<string | undefined>;
    getChangedFiles(owner: string, repository: string, pullNumber: number, token: string): Promise<Array<{ filename: string; status: string }>>;
    getFilesWithFirstDiffLine(owner: string, repository: string, pullNumber: number, token: string): Promise<Array<{ path: string; firstLine: number }>>;
}
