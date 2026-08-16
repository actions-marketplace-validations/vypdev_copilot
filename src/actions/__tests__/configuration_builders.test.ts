import { buildEmoji, buildIssue, buildLocale, buildProjects, buildPullRequest, buildTokens, buildWorkflows } from '../configuration_builders';

describe('configuration builders', () => {
    it('builds locale and workflows', () => {
        expect(buildLocale('es', 'fr')).toMatchObject({ issue: 'es', pullRequest: 'fr' });
        expect(buildWorkflows('release.yml', 'hotfix.yml')).toMatchObject({ release: 'release.yml', hotfix: 'hotfix.yml' });
    });

    it('builds project configuration with named columns', () => {
        const projects = buildProjects({
            projects: [],
            issueCreated: 'created',
            pullRequestCreated: 'pr-created',
            issueInProgress: 'progress',
            pullRequestInProgress: 'pr-progress',
        });

        expect(projects.getProjects()).toEqual([]);
        expect(projects.getProjectColumnIssueCreated()).toBe('created');
        expect(projects.getProjectColumnPullRequestCreated()).toBe('pr-created');
        expect(projects.getProjectColumnIssueInProgress()).toBe('progress');
        expect(projects.getProjectColumnPullRequestInProgress()).toBe('pr-progress');
    });

    it('preserves issue and pull request input context', () => {
        const inputs = { action: 'opened', issue: { title: 'Issue from CLI' } };
        const issue = buildIssue(true, false, 2, inputs);
        const pullRequest = buildPullRequest(1, 2, 30, inputs);

        expect(issue.inputs).toBe(inputs);
        expect(issue.branchManagementAlways).toBe(true);
        expect(pullRequest.inputs).toBe(inputs);
        expect(pullRequest.mergeTimeout).toBe(30);
    });

    it('builds emoji and token configuration', () => {
        expect(buildEmoji(true, 'branch')).toMatchObject({ emojiLabeledTitle: true, branchManagementEmoji: 'branch' });
        expect(buildTokens('token')).toMatchObject({ token: 'token' });
    });
});
