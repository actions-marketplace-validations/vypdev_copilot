export interface GithubBranchComparisonClient {
    rest: {
        repos: {
            compareCommits(parameters: Record<string, unknown>): Promise<{ data: {
                ahead_by: number;
                behind_by: number;
                total_commits: number;
                files?: Array<{ filename: string; status: string; additions?: number; deletions?: number; changes?: number; blob_url: string; raw_url: string; contents_url: string; patch?: string }>;
                commits: Array<{ sha: string; commit: { message: string; author?: { name?: string; email?: string; date?: string } } }>;
            } }>;
        };
    };
}

export interface GithubBranchClient {
    rest: {
        repos: {
            listBranches(parameters: Record<string, unknown>): Promise<{ data: Array<{ name: string }> }>;
        };
        git: {
            getRef(parameters: Record<string, unknown>): Promise<{ data: { ref: string } }>;
            deleteRef(parameters: Record<string, unknown>): Promise<unknown>;
        };
    };
}

export interface GithubBranchMergeClient {
    rest: {
        pulls: {
            create(parameters: Record<string, unknown>): Promise<{ data: { number: number } }>;
            listCommits(parameters: Record<string, unknown>): Promise<{ data: Array<{ commit: { message: string } }> }>;
            update(parameters: Record<string, unknown>): Promise<unknown>;
            merge(parameters: Record<string, unknown>): Promise<{ data: { merged: boolean } }>;
        };
        checks: {
            listForRef(parameters: Record<string, unknown>): Promise<{ data: { check_runs: Array<{ status: string; conclusion: string | null; name: string; pull_requests?: Array<{ number: number }> }> } }>;
        };
        repos: {
            getCombinedStatusForRef(parameters: Record<string, unknown>): Promise<{ data: { state: string; statuses: Array<{ context: string; state: string }> } }>;
            merge(parameters: Record<string, unknown>): Promise<unknown>;
        };
    };
}

export interface GithubClientPort<Client> {
    getClient(token: string): Client;
}

export interface GithubWorkflowClient {
    rest: {
        actions: {
            listWorkflowRunsForRepo(parameters: { owner: string; repo: string }): Promise<{ data: { workflow_runs: GithubWorkflowRun[] } }>;
            createWorkflowDispatch(parameters: { owner: string; repo: string; workflow_id: string; ref: string; inputs: Record<string, unknown> }): Promise<unknown>;
        };
    };
}

export interface GithubWorkflowRun {
    id: number;
    name?: string | null;
    head_branch: string;
    head_sha: string;
    run_number: number;
    event: string;
    status?: string | null;
    conclusion?: string | null;
    created_at: string;
    updated_at: string;
    url: string;
    html_url: string;
}

export interface GithubOrganizationClient {
    rest: {
        users: {
            getAuthenticated(): Promise<{ data: { login: string; name?: string | null; email?: string | null } }>;
            getByUsername(parameters: { username: string }): Promise<{ data: { type: string } }>;
        };
        orgs: {
            checkMembershipForUser(parameters: { org: string; username: string }): Promise<unknown>;
        };
        teams: {
            list(parameters: { org: string }): Promise<{ data: Array<{ slug: string }> }>;
            listMembersInOrg(parameters: { org: string; team_slug: string }): Promise<{ data: Array<{ login: string }> }>;
        };
    };
}

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

export interface GithubGraphqlClient {
    graphql<T>(query: string, variables?: Record<string, unknown>): Promise<T>;
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

export interface GithubIssueLifecycleClient {
    rest: {
        issues: {
            get(parameters: Record<string, unknown>): Promise<{ data: { state: "open" | "closed" } }>;
            update(parameters: Record<string, unknown>): Promise<unknown>;
        };
    };
}

export interface GithubIssueContentClient {
    paginate: {
        iterator(
            method: (parameters: Record<string, unknown>) => Promise<{ data: GithubIssueComment[] }>,
            parameters: Record<string, unknown>,
        ): AsyncIterable<{ data: GithubIssueComment[] }>;
    };
    rest: {
        issues: {
            get(parameters: Record<string, unknown>): Promise<{ data: { body?: string | null } }>;
            update(parameters: Record<string, unknown>): Promise<unknown>;
            createComment(parameters: Record<string, unknown>): Promise<unknown>;
            updateComment(parameters: Record<string, unknown>): Promise<unknown>;
            listComments(parameters: Record<string, unknown>): Promise<{ data: GithubIssueComment[] }>;
        };
    };
}

export interface GithubIssueComment {
    id: number;
    body?: string | null;
    user?: { login?: string };
}

export interface GithubIssueTitleClient {
    rest: {
        issues: {
            update(parameters: Record<string, unknown>): Promise<unknown>;
        };
    };
}

export interface GithubIssueMetadataClient {
    rest: {
        issues: {
            get(parameters: Record<string, unknown>): Promise<{ data: { title?: string; milestone?: { id: number; title: string; description?: string | null } | null; pull_request?: unknown } }>;
        };
        pulls: {
            get(parameters: Record<string, unknown>): Promise<{ data: { head: { ref: string } } }>;
        };
    };
}

export interface GithubIssueLabelsClient {
    rest: {
        issues: {
            listLabelsOnIssue(parameters: Record<string, unknown>): Promise<{ data: Array<{ name: string }> }>;
            setLabels(parameters: Record<string, unknown>): Promise<unknown>;
        };
    };
}

export interface GithubIssueLabelProvisioningClient {
    rest: {
        issues: {
            listLabelsForRepo(parameters: Record<string, unknown>): Promise<{ data: Array<{ name: string; color: string; description?: string | null }> }>;
            createLabel(parameters: Record<string, unknown>): Promise<unknown>;
        };
    };
}

export interface GithubIssueAssignmentClient {
    rest: {
        issues: {
            get(parameters: Record<string, unknown>): Promise<{ data: { assignees?: Array<{ login: string }> | null } }>;
            addAssignees(parameters: Record<string, unknown>): Promise<{ data: { assignees?: Array<{ login: string }> | null } }>;
        };
    };
}
