export interface PullRequestReviewPort {
    getCurrentReviewers(owner: string, repository: string, pullRequestNumber: number, token: string): Promise<string[]>;
    addReviewersToPullRequest(owner: string, repository: string, pullRequestNumber: number, reviewers: string[], token: string): Promise<string[]>;
}
