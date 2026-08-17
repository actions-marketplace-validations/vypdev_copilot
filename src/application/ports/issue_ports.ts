import type { IssueTypes } from '../../data/model/issue_types';
import type { Labels } from '../../data/model/labels';

export interface IssueDescriptionQueryPort {
    getDescription(owner: string, repository: string, issueNumber: number, token: string): Promise<string | undefined>;
}

export interface IssueIdentityQueryPort {
    getId(owner: string, repository: string, issueNumber: number, token: string): Promise<string>;
}

export interface IssueTitlePort {
    getTitle(owner: string, repository: string, issueNumber: number, token: string): Promise<string | undefined>;
    updateTitleIssueFormat(owner: string, repository: string, version: string, issueTitle: string, issueNumber: number, branchManagementAlways: boolean, branchManagementEmoji: string, labels: Labels, token: string): Promise<string | undefined>;
    updateTitlePullRequestFormat(owner: string, repository: string, pullRequestTitle: string, issueTitle: string, issueNumber: number, pullRequestNumber: number, branchManagementAlways: boolean, branchManagementEmoji: string, labels: Labels, token: string): Promise<string | undefined>;
}

export interface IssueClosurePort {
    closeIssue(owner: string, repository: string, issueNumber: number, token: string): Promise<boolean>;
    addComment(owner: string, repository: string, issueNumber: number, comment: string, token: string): Promise<void>;
}

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
