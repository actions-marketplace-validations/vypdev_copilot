import type { ProjectDetail } from '../data/model/project_detail';
import type { ProjectRepository } from '../data/repository/project_repository';

export async function loadProjectDetails(
    projectRepository: Pick<ProjectRepository, 'getProjectDetail'>,
    projectIds: string[],
    token: string,
): Promise<ProjectDetail[]> {
    const projects: ProjectDetail[] = [];
    for (const projectId of projectIds) {
        projects.push(await projectRepository.getProjectDetail(projectId, token));
    }
    return projects;
}
