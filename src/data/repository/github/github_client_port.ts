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
