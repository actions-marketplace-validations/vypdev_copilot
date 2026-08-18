import { OctokitReleaseClientAdapter } from "../github/octokit_client";
export const createReleaseClient = () => new OctokitReleaseClientAdapter();
