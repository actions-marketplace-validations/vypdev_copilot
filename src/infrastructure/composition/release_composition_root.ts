import type { RepositoryReleasePort } from "../../application/ports/repository_release_ports";
import { RepositoryReleaseRepository } from "../../data/repository/release/repository_release_repository";
import { GithubClientFactory } from "./github_client_factory";

export function createRepositoryReleasePort(): RepositoryReleasePort {
    return new RepositoryReleaseRepository(new GithubClientFactory().createReleaseClient());
}
