import { AuthenticatedUserRepository } from "../../data/repository/organization/authenticated_user_repository";
import { GithubClientFactory } from "./github_client_factory";

export function createAuthenticatedUserCompositionRoot(): AuthenticatedUserRepository {
    const clients = new GithubClientFactory();
    return new AuthenticatedUserRepository(clients.createOrganizationClient());
}
