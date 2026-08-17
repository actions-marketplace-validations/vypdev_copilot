import type { ActorAuthorizationPort, AuthenticatedUserPort, OrganizationMembersPort } from "../../../application/ports/organization_ports";
import { ActorAuthorizationRepository } from "./actor_authorization_repository";
import { AuthenticatedUserRepository } from "./authenticated_user_repository";
import { OrganizationMembersRepository } from "./organization_members_repository";
import type { GithubClientPort, GithubOrganizationClient } from "../github/github_client_port";

/**
 * Compatibility facade for callers that still need the complete organization capability.
 * New application code should depend on the narrow ports and adapters directly.
 */
export class OrganizationRepository implements OrganizationMembersPort, AuthenticatedUserPort, ActorAuthorizationPort {
    private readonly members: OrganizationMembersRepository;
    private readonly authenticatedUser: AuthenticatedUserRepository;
    private readonly authorization: ActorAuthorizationRepository;

    constructor(githubClient: GithubClientPort<GithubOrganizationClient>) {
        this.members = new OrganizationMembersRepository(githubClient);
        this.authenticatedUser = new AuthenticatedUserRepository(githubClient);
        this.authorization = new ActorAuthorizationRepository(githubClient);
    }

    getRandomMembers = (...args: Parameters<OrganizationMembersPort["getRandomMembers"]>) => this.members.getRandomMembers(...args);
    getAllMembers = (...args: Parameters<OrganizationMembersPort["getAllMembers"]>) => this.members.getAllMembers(...args);
    getUserFromToken = (...args: Parameters<AuthenticatedUserPort["getUserFromToken"]>) => this.authenticatedUser.getUserFromToken(...args);
    getTokenUserDetails = (...args: Parameters<AuthenticatedUserPort["getTokenUserDetails"]>) => this.authenticatedUser.getTokenUserDetails(...args);
    isActorAllowedToModifyFiles = (...args: Parameters<ActorAuthorizationPort["isActorAllowedToModifyFiles"]>) => this.authorization.isActorAllowedToModifyFiles(...args);
}
