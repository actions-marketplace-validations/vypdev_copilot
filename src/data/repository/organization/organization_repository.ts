import * as github from "@actions/github";
import { logDebugInfo, logError } from "../../../utils/logger";
import { authorizationForFileModification } from "../actor_modification_policy";
import { collectOrganizationMembers, selectAvailableMembers } from "../project_members_policy";
import type { ActorAuthorizationPort, AuthenticatedUserPort, OrganizationMembersPort } from "../../../application/ports/organization_ports";

export class OrganizationRepository implements OrganizationMembersPort, AuthenticatedUserPort, ActorAuthorizationPort {
    getRandomMembers = async (
        organization: string,
        membersToAdd: number,
        currentMembers: string[],
        token: string
    ): Promise<string[]> => {
        if (membersToAdd === 0) {
            return [];
        }

        const octokit = github.getOctokit(token);

        try {
            const {data: teams} = await octokit.rest.teams.list({
                org: organization,
            });

            if (teams.length === 0) {
                logDebugInfo(`${organization} doesn't have any team.`);
                return [];
            }

            const allMembers = await collectOrganizationMembers(
                teams,
                async (teamSlug) => {
                    const {data: members} = await octokit.rest.teams.listMembersInOrg({
                        org: organization,
                        team_slug: teamSlug,
                    });
                    return members;
                },
            );
            const selectedMembers = selectAvailableMembers(allMembers, currentMembers, membersToAdd);

            if (selectedMembers.length === 0) {
                logDebugInfo(`No available members to assign for organization ${organization}.`);
            }
            return selectedMembers;
        } catch (error) {
            logError(`Error getting random members: ${error}.`);
        }
        return [];
    };

    getAllMembers = async (
        organization: string,
        token: string
    ): Promise<string[]> => {
        const octokit = github.getOctokit(token);

        try {
            const {data: teams} = await octokit.rest.teams.list({
                org: organization,
            });

            if (teams.length === 0) {
                logDebugInfo(`${organization} doesn't have any team.`);
                return [];
            }

            return await collectOrganizationMembers(
                teams,
                async (teamSlug) => {
                    const {data: members} = await octokit.rest.teams.listMembersInOrg({
                        org: organization,
                        team_slug: teamSlug,
                    });
                    return members;
                },
            );
        } catch (error) {
            logError(`Error getting all members: ${error}.`);
        }
        return [];
    };

    getUserFromToken = async (token: string): Promise<string> => {
        const octokit = github.getOctokit(token);
        const {data: user} = await octokit.rest.users.getAuthenticated();
        return user.login;
    };

    /**
     * Returns true if the actor (user who triggered the event) is allowed to run use cases
     * that ask OpenCode to modify files (e.g. bugbot autofix, generic user request).
     * - When the repo owner is an Organization: actor must be a member of that organization.
     * - When the repo owner is a User: actor must be the owner (same login).
     */
    isActorAllowedToModifyFiles = async (
        owner: string,
        actor: string,
        token: string
    ): Promise<boolean> => {
        try {
            const octokit = github.getOctokit(token);
            const { data: ownerUser } = await octokit.rest.users.getByUsername({ username: owner });
            const authorization = authorizationForFileModification(owner, actor, ownerUser.type);
            if (authorization.kind === 'owner') {
                return authorization.allowed;
            }

            try {
                await octokit.rest.orgs.checkMembershipForUser({
                    org: authorization.organization,
                    username: authorization.actor,
                });
                return true;
            } catch (membershipErr: unknown) {
                const status = (membershipErr as { status?: number })?.status;
                if (status === 404) return false;
                logDebugInfo(`checkMembershipForUser(${owner}, ${actor}): ${membershipErr instanceof Error ? membershipErr.message : String(membershipErr)}`);
                return false;
            }
        } catch (err) {
            logDebugInfo(`isActorAllowedToModifyFiles(${owner}, ${actor}): ${err instanceof Error ? err.message : String(err)}`);
            return false;
        }
    };

    /** Name and email of the token user, for git commit author (e.g. bugbot autofix). */
    getTokenUserDetails = async (token: string): Promise<{ name: string; email: string }> => {
        const octokit = github.getOctokit(token);
        const { data: user } = await octokit.rest.users.getAuthenticated();
        const name = (user.name ?? user.login ?? "GitHub Action").trim() || "GitHub Action";
        const email =
            (typeof user.email === "string" && user.email.trim().length > 0)
                ? user.email.trim()
                : `${user.login}@users.noreply.github.com`;
        return { name, email };
    };

}
