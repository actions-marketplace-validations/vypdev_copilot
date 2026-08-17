export interface BugbotPullRequestQueryPort {
    getHeadBranchForIssue(owner: string, repository: string, issueNumber: number, token: string): Promise<string | undefined>;
    getPullRequestReviewCommentBody(
        owner: string,
        repository: string,
        pullNumber: number,
        commentId: number,
        token: string,
    ): Promise<string | null>;
}
