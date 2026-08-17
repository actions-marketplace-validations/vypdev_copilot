import * as github from "@actions/github";
import type { GithubClientPort, GithubOrganizationClient, GithubWorkflowClient } from "../../data/repository/github/github_client_port";

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

export class OctokitOrganizationClientAdapter implements GithubClientPort<GithubOrganizationClient> {
    getClient(token: string): GithubOrganizationClient {
        return github.getOctokit(token) as unknown as GithubOrganizationClient;
    }
}
