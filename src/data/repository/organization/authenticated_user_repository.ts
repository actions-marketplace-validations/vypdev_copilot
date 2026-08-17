import type { AuthenticatedUserPort } from "../../../application/ports/organization_ports";
import type { GithubClientPort, GithubOrganizationClient } from "../github/github_client_port";

export class AuthenticatedUserRepository implements AuthenticatedUserPort {
    constructor(private readonly githubClient: GithubClientPort<GithubOrganizationClient>) {}
    getUserFromToken = async (token: string): Promise<string> => {
        const octokit = this.githubClient.getClient(token);
        const { data: user } = await octokit.rest.users.getAuthenticated();
        return user.login;
    };

    getTokenUserDetails = async (token: string): Promise<{ name: string; email: string }> => {
        const octokit = this.githubClient.getClient(token);
        const { data: user } = await octokit.rest.users.getAuthenticated();
        const name = (user.name ?? user.login ?? "GitHub Action").trim() || "GitHub Action";
        const email = typeof user.email === "string" && user.email.trim().length > 0
            ? user.email.trim()
            : `${user.login}@users.noreply.github.com`;
        return { name, email };
    };
}
