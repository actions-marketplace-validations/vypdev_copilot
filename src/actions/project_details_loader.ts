import type { ProjectDetail } from '../data/model/project_detail';
import type { ProjectDetailQueryPort } from '../data/repository/github_repository_ports';

export async function loadProjectDetails(
    projectRepository: ProjectDetailQueryPort,
    projectIds: string[],
    token: string,
): Promise<ProjectDetail[]> {
    const projects: ProjectDetail[] = [];
    for (const projectId of projectIds) {
        projects.push(await projectRepository.getProjectDetail(projectId, token));
    }
    return projects;
}
