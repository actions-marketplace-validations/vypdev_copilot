import { OctokitBranchClientAdapter, OctokitBranchMergeClientAdapter, OctokitBranchComparisonClientAdapter } from "../github/octokit_client";
export const createBranchClient = () => new OctokitBranchClientAdapter();
export const createBranchMergeClient = () => new OctokitBranchMergeClientAdapter();
export const createBranchComparisonClient = () => new OctokitBranchComparisonClientAdapter();
