export interface OrganizationMembersPort {
    getRandomMembers(
        organization: string,
        membersToAdd: number,
        currentMembers: string[],
        token: string,
    ): Promise<string[]>;
    getAllMembers(organization: string, token: string): Promise<string[]>;
}

export interface AuthenticatedUserPort {
    getUserFromToken(token: string): Promise<string>;
    getTokenUserDetails(token: string): Promise<{ name: string; email: string }>;
}

export interface ActorAuthorizationPort {
    isActorAllowedToModifyFiles(owner: string, actor: string, token: string): Promise<boolean>;
}
