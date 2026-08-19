export interface BugbotIssueCommentWritePort {
    addComment(owner: string, repository: string, issueNumber: number, comment: string, token: string, options?: { commitSha?: string }): Promise<void>;
    updateComment(owner: string, repository: string, issueNumber: number, commentId: number, comment: string, token: string, options?: { commitSha?: string }): Promise<void>;
}
