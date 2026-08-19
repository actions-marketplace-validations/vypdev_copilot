import { getOctokitClient } from "./octokit_client_resolver";
import type { GithubClientPort } from "./ports/github_client_provider_port";
import type { GithubPullRequestChangesClient, GithubPullRequestLifecycleClient, GithubPullRequestReviewClient } from "../../application/ports/github_pull_request_ports";

export class OctokitPullRequestChangesClientAdapter implements GithubClientPort<GithubPullRequestChangesClient> {
    getClient(token: string): GithubPullRequestChangesClient { return getOctokitClient<GithubPullRequestChangesClient>(token); }
}
export class OctokitPullRequestLifecycleClientAdapter implements GithubClientPort<GithubPullRequestLifecycleClient> {
    getClient(token: string): GithubPullRequestLifecycleClient { return getOctokitClient<GithubPullRequestLifecycleClient>(token); }
}
export class OctokitPullRequestReviewClientAdapter implements GithubClientPort<GithubPullRequestReviewClient> {
    getClient(token: string): GithubPullRequestReviewClient { return getOctokitClient<GithubPullRequestReviewClient>(token); }
}
