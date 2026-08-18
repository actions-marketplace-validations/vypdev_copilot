import { OctokitPullRequestChangesClientAdapter, OctokitPullRequestLifecycleClientAdapter, OctokitPullRequestReviewClientAdapter } from "../github/octokit_client";
export const createPullRequestChangesClient = () => new OctokitPullRequestChangesClientAdapter();
export const createPullRequestLifecycleClient = () => new OctokitPullRequestLifecycleClientAdapter();
export const createPullRequestReviewClient = () => new OctokitPullRequestReviewClientAdapter();
