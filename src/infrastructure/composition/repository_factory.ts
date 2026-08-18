
import { ActorAuthorizationRepository } from "../../data/repository/organization/actor_authorization_repository";

import { IssueTypeAssignmentRepository } from "../../data/repository/issue/issue_type_assignment_repository";

import { GithubClientFactory } from "./github_client_factory";

export class RepositoryFactory {
    private readonly githubClients = new GithubClientFactory();
    createOrganizationGithubClient(): ReturnType<GithubClientFactory['createOrganizationClient']> {
        return this.githubClients.createOrganizationClient();
    }
    createActorAuthorizationRepository(): ActorAuthorizationRepository {
        return new ActorAuthorizationRepository(this.createOrganizationGithubClient());
    }


    createIssueTypeAssignmentRepository(
        getIssueId: ConstructorParameters<typeof IssueTypeAssignmentRepository>[0],
    ): IssueTypeAssignmentRepository {
        return new IssueTypeAssignmentRepository(getIssueId, this.githubClients.createGraphqlClient());
    }



}
