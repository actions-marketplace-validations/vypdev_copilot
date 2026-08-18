import { logDebugInfo } from "../../../utils/logger";
import { authorizationForFileModification } from "../actor_modification_policy";
import type { ActorAuthorizationPort } from "../../../application/ports//actor_authorization_ports";
import type { GithubClientPort, GithubActorAuthorizationClient } from "../../../application/ports/github_provider_ports";

export class ActorAuthorizationRepository implements ActorAuthorizationPort {
    constructor(private readonly githubClient: GithubClientPort<GithubActorAuthorizationClient>) {}
    isActorAllowedToModifyFiles = async (owner: string, actor: string, token: string): Promise<boolean> => {
        try {
            const octokit = this.githubClient.getClient(token);
            const { data: ownerUser } = await octokit.rest.users.getByUsername({ username: owner });
            const authorization = authorizationForFileModification(owner, actor, ownerUser.type);
            if (authorization.kind === 'owner') return authorization.allowed;
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
}
