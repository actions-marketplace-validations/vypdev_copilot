import { logDebugInfo, logError } from "../../../utils/logger";
import { collectOrganizationMembers, selectAvailableMembers } from "../project_members_policy";
import type { OrganizationMembersPort } from "../../../application/ports/organization_members_ports";
import type { GithubClientPort } from "../../../application/ports/github_client_ports";
import type { GithubOrganizationMembersClient } from "../../../application/ports/github_identity_ports";

export class OrganizationMembersRepository implements OrganizationMembersPort {
    constructor(private readonly githubClient: GithubClientPort<GithubOrganizationMembersClient>) {}
    getRandomMembers = async (
        organization: string,
        membersToAdd: number,
        currentMembers: string[],
        token: string,
    ): Promise<string[]> => {
        if (membersToAdd === 0) return [];
        const octokit = this.githubClient.getClient(token);
        try {
            const { data: teams } = await octokit.rest.teams.list({ org: organization });
            if (teams.length === 0) {
                logDebugInfo(`${organization} doesn't have any team.`);
                return [];
            }
            const allMembers = await collectOrganizationMembers(teams, async (teamSlug) => {
                const { data: members } = await octokit.rest.teams.listMembersInOrg({ org: organization, team_slug: teamSlug });
                return members;
            });
            const selectedMembers = selectAvailableMembers(allMembers, currentMembers, membersToAdd);
            if (selectedMembers.length === 0) logDebugInfo(`No available members to assign for organization ${organization}.`);
            return selectedMembers;
        } catch (error) {
            logError(`Error getting random members: ${error}.`);
            return [];
        }
    };

    getAllMembers = async (organization: string, token: string): Promise<string[]> => {
        const octokit = this.githubClient.getClient(token);
        try {
            const { data: teams } = await octokit.rest.teams.list({ org: organization });
            if (teams.length === 0) {
                logDebugInfo(`${organization} doesn't have any team.`);
                return [];
            }
            return await collectOrganizationMembers(teams, async (teamSlug) => {
                const { data: members } = await octokit.rest.teams.listMembersInOrg({ org: organization, team_slug: teamSlug });
                return members;
            });
        } catch (error) {
            logError(`Error getting all members: ${error}.`);
            return [];
        }
    };
}
