import { OctokitWorkflowClientAdapter } from "../github/octokit_workflow_adapters";
export const createWorkflowClient = () => new OctokitWorkflowClientAdapter();
