import type { RepositoryReleasePublicationPort } from "../../application/ports/repository_release_ports";
import { RepositoryReleasePublicationRepository } from "../../data/repository/release/repository_release_publication_repository";
import { GithubClientFactory } from "./github_client_factory";

export function createRepositoryReleasePort(): RepositoryReleasePublicationPort {
    return new RepositoryReleasePublicationRepository(new GithubClientFactory().createReleaseClient());
}
