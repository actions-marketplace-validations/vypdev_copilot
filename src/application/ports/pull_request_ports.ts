export interface PullRequestBranchQueryPort {
    getOpenPullRequestNumbersByHeadBranch(owner: string, repository: string, branch: string, token: string): Promise<number[]>;
}

export interface PullRequestDescriptionCommandPort {
    updateDescription(owner: string, repository: string, pullRequestNumber: number, description: string, token: string): Promise<void>;
}

export interface PullRequestReviewPort {
    getCurrentReviewers(owner: string, repository: string, pullRequestNumber: number, token: string): Promise<string[]>;
    addReviewersToPullRequest(owner: string, repository: string, pullRequestNumber: number, reviewers: string[], token: string): Promise<string[]>;
}
