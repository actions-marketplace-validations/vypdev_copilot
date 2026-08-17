import type { ActorAuthorizationPort, AuthenticatedUserPort, OrganizationMembersPort } from "../../../application/ports/organization_ports";
import { ActorAuthorizationRepository } from "./actor_authorization_repository";
import { AuthenticatedUserRepository } from "./authenticated_user_repository";
import { OrganizationMembersRepository } from "./organization_members_repository";

/**
 * Compatibility facade for callers that still need the complete organization capability.
 * New application code should depend on the narrow ports and adapters directly.
 */
export class OrganizationRepository implements OrganizationMembersPort, AuthenticatedUserPort, ActorAuthorizationPort {
    private readonly members = new OrganizationMembersRepository();
    private readonly authenticatedUser = new AuthenticatedUserRepository();
    private readonly authorization = new ActorAuthorizationRepository();

    getRandomMembers = this.members.getRandomMembers;
    getAllMembers = this.members.getAllMembers;
    getUserFromToken = this.authenticatedUser.getUserFromToken;
    getTokenUserDetails = this.authenticatedUser.getTokenUserDetails;
    isActorAllowedToModifyFiles = this.authorization.isActorAllowedToModifyFiles;
}
