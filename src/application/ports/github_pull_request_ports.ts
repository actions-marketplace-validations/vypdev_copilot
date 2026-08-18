export interface GithubPullRequestChangesClient {
    paginate: {
        iterator(
            method: (parameters: Record<string, unknown>) => Promise<{ data: GithubPullRequestFile[] }>,
            parameters: Record<string, unknown>,
        ): AsyncIterable<{ data: GithubPullRequestFile[] }>;
    };
    rest: {
        pulls: {
            listFiles(parameters: Record<string, unknown>): Promise<{ data: GithubPullRequestFile[] }>;
            get(parameters: Record<string, unknown>): Promise<{ data: { head?: { sha?: string } } }>;
        };
    };
}



export interface GithubPullRequestFile {
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    patch?: string;
}



export interface GithubPullRequestReviewClient {
    paginate: {
        iterator(
            method: (parameters: Record<string, unknown>) => Promise<{ data: GithubReviewComment[] }>,
            parameters: Record<string, unknown>,
        ): AsyncIterable<{ data: GithubReviewComment[] }>;
    };
    rest: {
        pulls: {
            listRequestedReviewers(parameters: Record<string, unknown>): Promise<{ data: { users: GithubReviewUser[] } }>;
            listReviews(parameters: Record<string, unknown>): Promise<{ data: GithubReview[] }>;
            requestReviewers(parameters: Record<string, unknown>): Promise<{ data: { requested_reviewers?: GithubReviewUser[] } }>;
            listReviewComments(parameters: Record<string, unknown>): Promise<{ data: GithubReviewComment[] }>;
            getReviewComment(parameters: Record<string, unknown>): Promise<{ data: GithubReviewComment }>;
            createReviewComment(parameters: Record<string, unknown>): Promise<unknown>;
            updateReviewComment(parameters: Record<string, unknown>): Promise<unknown>;
        };
    };
}



export interface GithubReviewUser {
    login: string;
}



export interface GithubReview {
    user?: GithubReviewUser | null;
}



export interface GithubReviewComment {
    id: number;
    body: string | null;
    path?: string;
    line?: number;
    node_id?: string;
}



export interface GithubPullRequestLifecycleClient {
    rest: {
        pulls: {
            list(parameters: Record<string, unknown>): Promise<{ data: GithubPullRequestSummary[] }>;
            update(parameters: Record<string, unknown>): Promise<unknown>;
        };
    };
}



export interface GithubPullRequestSummary {
    number: number;
    body?: string | null;
    head?: { ref?: string | null };
}


