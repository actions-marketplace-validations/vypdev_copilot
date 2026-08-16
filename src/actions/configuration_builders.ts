import { Emoji } from '../data/model/emoji';
import { Issue } from '../data/model/issue';
import { Images } from '../data/model/images';
import { Locale } from '../data/model/locale';
import { PullRequest } from '../data/model/pull_request';
import { Projects } from '../data/model/projects';
import { ProjectDetail } from '../data/model/project_detail';
import { Tokens } from '../data/model/tokens';
import { Workflows } from '../data/model/workflows';

export interface ImageScopeValues {
    automatic: string[];
    feature: string[];
    bugfix: string[];
    release: string[];
    hotfix: string[];
    docs: string[];
    chore: string[];
}

export interface ImageConfigurationValues {
    onIssue: boolean;
    onPullRequest: boolean;
    onCommit: boolean;
    issue: ImageScopeValues;
    pullRequest: ImageScopeValues;
    commit: ImageScopeValues;
}

export interface ProjectConfigurationValues {
    projects: ProjectDetail[];
    issueCreated: string;
    pullRequestCreated: string;
    issueInProgress: string;
    pullRequestInProgress: string;
}

export function buildProjects(values: ProjectConfigurationValues): Projects {
    return new Projects(
        values.projects,
        values.issueCreated,
        values.pullRequestCreated,
        values.issueInProgress,
        values.pullRequestInProgress,
    );
}

export function buildWorkflows(release: string, hotfix: string): Workflows {
    return new Workflows(release, hotfix);
}

export function buildLocale(issue: string, pullRequest: string): Locale {
    return new Locale(issue, pullRequest);
}

export function buildIssue(branchManagementAlways: boolean, reopenOnPush: boolean, desiredAssigneesCount: number, inputs?: unknown): Issue {
    return new Issue(branchManagementAlways, reopenOnPush, desiredAssigneesCount, inputs);
}

export function buildPullRequest(desiredAssigneesCount: number, desiredReviewersCount: number, mergeTimeout: number, inputs?: unknown): PullRequest {
    return new PullRequest(desiredAssigneesCount, desiredReviewersCount, mergeTimeout, inputs);
}

export function buildEmoji(emojiLabeledTitle: boolean, branchManagementEmoji: string): Emoji {
    return new Emoji(emojiLabeledTitle, branchManagementEmoji);
}

export function buildTokens(token: string): Tokens {
    return new Tokens(token);
}

export function buildImages(values: ImageConfigurationValues): Images {
    return new Images(
        values.onIssue,
        values.onPullRequest,
        values.onCommit,
        values.issue.automatic,
        values.issue.feature,
        values.issue.bugfix,
        values.issue.docs,
        values.issue.chore,
        values.issue.release,
        values.issue.hotfix,
        values.pullRequest.automatic,
        values.pullRequest.feature,
        values.pullRequest.bugfix,
        values.pullRequest.release,
        values.pullRequest.hotfix,
        values.pullRequest.docs,
        values.pullRequest.chore,
        values.commit.automatic,
        values.commit.feature,
        values.commit.bugfix,
        values.commit.release,
        values.commit.hotfix,
        values.commit.docs,
        values.commit.chore,
    );
}
