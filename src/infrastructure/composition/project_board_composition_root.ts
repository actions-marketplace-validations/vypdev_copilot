import { ProjectBoardRepository } from "../../data/repository/project/project_board_repository";
import { GithubClientFactory } from "./github_client_factory";

export function createProjectBoardCompositionRoot(): ProjectBoardRepository {
    const clients = new GithubClientFactory();
    return new ProjectBoardRepository(
        clients.createRepositoryContextClient(),
        clients.createOwnerTypeClient(),
        clients.createGraphqlClient(),
    );
}
