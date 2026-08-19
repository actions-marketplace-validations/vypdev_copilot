export interface GithubRepositoryContextClient {
    context: { repo: { owner: string } };
}



export interface GithubOwnerTypeClient {
    rest: {
        users: {
            getByUsername(parameters: { username: string }): Promise<{ data: { type?: string } }>;
        };
    };
}



export interface GithubAuthenticatedUserClient {
    rest: {
        users: {
            getAuthenticated(): Promise<{ data: { login: string; name?: string | null; email?: string | null } }>;
        };
    };
}



export interface GithubActorAuthorizationClient {
    rest: {
        users: {
            getByUsername(parameters: { username: string }): Promise<{ data: { type: string } }>;
        };
        orgs: {
            checkMembershipForUser(parameters: { org: string; username: string }): Promise<unknown>;
        };
    };
}



export interface GithubOrganizationMembersClient {
    rest: {
        teams: {
            list(parameters: { org: string }): Promise<{ data: Array<{ slug: string }> }>;
            listMembersInOrg(parameters: { org: string; team_slug: string }): Promise<{ data: Array<{ login: string }> }>;
        };
    };
}



