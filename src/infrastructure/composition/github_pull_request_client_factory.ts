import { OctokitPullRequestChangesClientAdapter, OctokitPullRequestLifecycleClientAdapter, OctokitPullRequestReviewClientAdapter } from "../github/octokit_pull_request_adapters";
export const createPullRequestChangesClient = () => new OctokitPullRequestChangesClientAdapter();
export const createPullRequestLifecycleClient = () => new OctokitPullRequestLifecycleClientAdapter();
export const createPullRequestReviewClient = () => new OctokitPullRequestReviewClientAdapter();
