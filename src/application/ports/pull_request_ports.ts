export interface PullRequestBranchQueryPort {
    getOpenPullRequestNumbersByHeadBranch(owner: string, repository: string, branch: string, token: string): Promise<number[]>;
}

export interface PullRequestDescriptionCommandPort {
    updateDescription(owner: string, repository: string, pullRequestNumber: number, description: string, token: string): Promise<void>;
}
