import * as github from "@actions/github";
import type { GithubClientPort } from "../../data/repository/github/github_client_port";

export type OctokitClient = ReturnType<typeof github.getOctokit>;

export class OctokitClientAdapter implements GithubClientPort<OctokitClient> {
    getClient(token: string): OctokitClient {
        return github.getOctokit(token);
    }
}
