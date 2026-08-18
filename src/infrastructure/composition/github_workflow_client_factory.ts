import { OctokitWorkflowClientAdapter } from "../github/octokit_client";
export const createWorkflowClient = () => new OctokitWorkflowClientAdapter();
