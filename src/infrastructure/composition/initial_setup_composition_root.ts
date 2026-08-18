import { InitialSetupUseCase } from "../../application/usecases/actions/initial_setup_use_case";
import { IssueLabelProvisioningRepository } from "../../data/repository/issue/issue_label_provisioning_repository";
import { IssueLabelRepository } from "../../data/repository/issue/issue_label_repository";
import { IssueProgressLabelRepository } from "../../data/repository/issue/issue_progress_label_repository";
import { IssueTypeRepository } from "../../data/repository/issue/issue_type_repository";
import { AuthenticatedUserRepository } from "../../data/repository/organization/authenticated_user_repository";
import { RepositoryReleaseRepository } from "../../data/repository/release/repository_release_repository";
import { GitCliRepository } from "../../data/repository/git_cli_repository";
import { GithubClientFactory } from "./github_client_factory";
import { composeInitialSetupUseCase } from "./initial_setup_use_case_composition";

export function createInitialSetupCompositionRoot(): InitialSetupUseCase {
    const clients = new GithubClientFactory();
    const progressLabels = new IssueProgressLabelRepository(
        new IssueLabelRepository(clients.createIssueLabelsClient()),
    );
    const labelProvisioning = new IssueLabelProvisioningRepository(
        clients.createIssueLabelProvisioningClient(),
    );

    return composeInitialSetupUseCase(
        new AuthenticatedUserRepository(clients.createOrganizationClient()),
        labelProvisioning,
        {
            ensureProgressLabels: (owner, repository, token) => progressLabels.ensureProgressLabels(
                owner,
                repository,
                token,
                labelProvisioning.ensureLabel,
            ),
        },
        new IssueTypeRepository(clients.createGraphqlClient()),
        new GitCliRepository(),
        new RepositoryReleaseRepository(clients.createReleaseClient()),
    );
}
