export interface BugbotIssueComment {
    id: number;
    body: string | null;
    user?: { login?: string };
}

export interface BugbotPullRequestReviewComment {
    id: number;
    body: string | null;
    path?: string;
    line?: number;
    node_id?: string;
}

export interface BugbotIssueContextPort {
    listIssueComments(owner: string, repository: string, issueNumber: number, token: string): Promise<BugbotIssueComment[]>;
}

export interface BugbotPullRequestQueryPort {
    getHeadBranchForIssue(owner: string, repository: string, issueNumber: number, token: string): Promise<string | undefined>;
    getPullRequestReviewCommentBody(owner: string, repository: string, pullNumber: number, commentId: number, token: string): Promise<string | null>;
}

export interface BugbotPullRequestContextPort extends BugbotPullRequestQueryPort {
    getOpenPullRequestNumbersByHeadBranch(owner: string, repository: string, branch: string, token: string): Promise<number[]>;
    listPullRequestReviewComments(owner: string, repository: string, pullNumber: number, token: string): Promise<BugbotPullRequestReviewComment[]>;
    getPullRequestHeadSha(owner: string, repository: string, pullNumber: number, token: string): Promise<string | undefined>;
    getChangedFiles(owner: string, repository: string, pullNumber: number, token: string): Promise<Array<{ filename: string; status: string }>>;
    getFilesWithFirstDiffLine(owner: string, repository: string, pullNumber: number, token: string): Promise<Array<{ path: string; firstLine: number }>>;
}

export interface BugbotContextPorts {
    issue: BugbotIssueContextPort;
    pullRequest: BugbotPullRequestContextPort;
}

export interface BugbotIssueCommentWritePort {
    addComment(owner: string, repository: string, issueNumber: number, comment: string, token: string, options?: { commitSha?: string }): Promise<void>;
    updateComment(owner: string, repository: string, issueNumber: number, commentId: number, comment: string, token: string, options?: { commitSha?: string }): Promise<void>;
}

export interface BugbotPullRequestCommentWritePort {
    createReviewWithComments(owner: string, repository: string, pullNumber: number, commitSha: string, comments: Array<{ path: string; line: number; body: string }>, token: string): Promise<void>;
    updatePullRequestReviewComment(owner: string, repository: string, commentId: number, body: string, token: string): Promise<void>;
    listPullRequestReviewComments(owner: string, repository: string, pullNumber: number, token: string): Promise<BugbotPullRequestReviewComment[]>;
    resolvePullRequestReviewThread(owner: string, repository: string, pullNumber: number, nodeId: string, token: string): Promise<void>;
}

export interface BugbotWritePorts {
    issueComments: BugbotIssueCommentWritePort;
    pullRequestComments: BugbotPullRequestCommentWritePort;
}
