import { getOctokitClient } from "./octokit_client_resolver";
import type { GithubClientPort } from "./ports/github_client_provider_port";
import type { GithubWorkflowClient } from "../../application/ports/github_workflow_ports";

export class OctokitWorkflowClientAdapter implements GithubClientPort<GithubWorkflowClient> {
    getClient(token: string): GithubWorkflowClient { return getOctokitClient<GithubWorkflowClient>(token); }
}
