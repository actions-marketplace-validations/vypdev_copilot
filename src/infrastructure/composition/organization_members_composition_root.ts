import { OrganizationMembersRepository } from "../../data/repository/organization/organization_members_repository";
import { GithubClientFactory } from "./github_client_factory";

export function createOrganizationMembersCompositionRoot(): OrganizationMembersRepository {
    const clients = new GithubClientFactory();
    return new OrganizationMembersRepository(clients.createOrganizationClient());
}
