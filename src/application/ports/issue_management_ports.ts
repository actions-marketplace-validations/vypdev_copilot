import type { IssueTypes } from '../../data/model/issue_types';
import type { Labels } from '../../data/model/labels';

export interface IssueAssigneePort {
    getCurrentAssignees(owner: string, repository: string, issueNumber: number, token: string): Promise<string[]>;
    assignMembersToIssue(owner: string, repository: string, issueNumber: number, members: string[], token: string): Promise<string[]>;
}

export interface IssueLabelsPort {
    getLabels(owner: string, repository: string, issueNumber: number, token: string): Promise<string[]>;
    setLabels(owner: string, repository: string, issueNumber: number, labels: string[], token: string): Promise<void>;
}

export interface IssueProgressPort {
    setProgressLabel(owner: string, repository: string, issueNumber: number, progress: number, token: string): Promise<void>;
}

export interface IssueLabelProvisioningPort {
    ensureLabels(owner: string, repository: string, labels: Labels, token: string): Promise<{ created: number; existing: number; errors: string[] }>;
}

export interface IssueProgressLabelProvisioningPort {
    ensureProgressLabels(owner: string, repository: string, token: string): Promise<{ created: number; existing: number; errors: string[] }>;
}

export interface IssueTypeProvisioningPort {
    ensureIssueTypes(owner: string, issueTypes: IssueTypes, token: string): Promise<{ created: number; existing: number; errors: string[] }>;
}

export interface IssueTypeAssignmentPort {
    setIssueType(owner: string, repository: string, issueNumber: number, labels: Labels, issueTypes: IssueTypes, token: string): Promise<void>;
}
