
import { ActorAuthorizationRepository } from "../../data/repository/organization/actor_authorization_repository";

import { IssueAssignmentRepository } from "../../data/repository/issue/issue_assignment_repository";
import { IssueContentRepository } from "../../data/repository/issue/issue_content_repository";
import { IssueLabelRepository } from "../../data/repository/issue/issue_label_repository";
import { IssueLifecycleRepository } from "../../data/repository/issue/issue_lifecycle_repository";
import { IssueTypeAssignmentRepository } from "../../data/repository/issue/issue_type_assignment_repository";
import { IssueClosureRepository } from "../../data/repository/issue/issue_closure_repository";
import { IssueNotificationRepository } from "../../data/repository/issue/issue_notification_repository";

import { GithubClientFactory } from "./github_client_factory";

export class RepositoryFactory {
    private readonly githubClients = new GithubClientFactory();
    createOrganizationGithubClient(): ReturnType<GithubClientFactory['createOrganizationClient']> {
        return this.githubClients.createOrganizationClient();
    }
    createActorAuthorizationRepository(): ActorAuthorizationRepository {
        return new ActorAuthorizationRepository(this.createOrganizationGithubClient());
    }


    createIssueAssignmentRepository(): IssueAssignmentRepository { return new IssueAssignmentRepository(this.githubClients.createIssueAssignmentClient()); }
    createIssueLabelRepository(): IssueLabelRepository { return new IssueLabelRepository(this.githubClients.createIssueLabelsClient()); }
    createIssueClosureRepository(): IssueClosureRepository {
        return new IssueClosureRepository(new IssueLifecycleRepository(this.githubClients.createIssueLifecycleClient()), new IssueContentRepository(this.githubClients.createIssueContentClient()));
    }
    createIssueNotificationRepository(): IssueNotificationRepository {
        return new IssueNotificationRepository(new IssueLifecycleRepository(this.githubClients.createIssueLifecycleClient()), new IssueContentRepository(this.githubClients.createIssueContentClient()));
    }
    createIssueTypeAssignmentRepository(
        getIssueId: ConstructorParameters<typeof IssueTypeAssignmentRepository>[0],
    ): IssueTypeAssignmentRepository {
        return new IssueTypeAssignmentRepository(getIssueId, this.githubClients.createGraphqlClient());
    }



}
