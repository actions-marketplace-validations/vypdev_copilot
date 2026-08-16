import { Locale } from '../data/model/locale';
import { Projects } from '../data/model/projects';
import { ProjectDetail } from '../data/model/project_detail';
import { Workflows } from '../data/model/workflows';

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
