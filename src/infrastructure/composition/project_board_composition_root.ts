import type { ProjectBoardCommandPort, ProjectBoardLinkPort, ProjectBoardQueryPort } from '../../application/ports/project_board_ports';
import { ProjectBoardCommandRepository } from '../../data/repository/project/project_board_command_repository';
import { ProjectBoardLinkRepository } from '../../data/repository/project/project_board_link_repository';
import { ProjectBoardQueryRepository } from '../../data/repository/project/project_board_query_repository';
import { GithubClientFactory } from './github_client_factory';

export interface ProjectBoardComposition {
    query: ProjectBoardQueryPort;
    link: ProjectBoardLinkPort;
    command: ProjectBoardCommandPort;
}

export function createProjectBoardCompositionRoot(): ProjectBoardComposition {
    const clients = new GithubClientFactory();
    const query = new ProjectBoardQueryRepository(
        clients.createRepositoryContextClient(),
        clients.createOwnerTypeClient(),
        clients.createGraphqlTransportClient(),
    );
    return {
        query,
        link: new ProjectBoardLinkRepository(query, clients.createGraphqlTransportClient()),
        command: new ProjectBoardCommandRepository(query, clients.createGraphqlTransportClient()),
    };
}
