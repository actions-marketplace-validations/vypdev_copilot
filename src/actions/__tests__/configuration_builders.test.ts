import { buildLocale, buildProjects, buildWorkflows } from '../configuration_builders';

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
});
