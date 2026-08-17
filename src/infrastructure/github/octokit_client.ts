import * as github from "@actions/github";
import type { GithubClientPort, GithubWorkflowClient } from "../../data/repository/github/github_client_port";

export type OctokitClient = ReturnType<typeof github.getOctokit>;

export class OctokitClientAdapter implements GithubClientPort<OctokitClient> {
    getClient(token: string): OctokitClient {
        return github.getOctokit(token);
    }
}

export class OctokitWorkflowClientAdapter implements GithubClientPort<GithubWorkflowClient> {
    getClient(token: string): GithubWorkflowClient {
        return github.getOctokit(token) as unknown as GithubWorkflowClient;
    }
}
