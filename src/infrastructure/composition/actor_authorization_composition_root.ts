import { ActorAuthorizationRepository } from '../../data/repository/organization/actor_authorization_repository';
import { GithubClientFactory } from './github_client_factory';

export function createActorAuthorizationRepository(): ActorAuthorizationRepository {
    return new ActorAuthorizationRepository(new GithubClientFactory().createOrganizationClient());
}
