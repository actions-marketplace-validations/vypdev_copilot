import { logDebugInfo, logError } from "../../../utils/logger";
import type { GithubClientPort, GithubIssueLabelProvisioningClient } from "../../../application/ports/github_provider_ports";
import { Labels } from "../../model/labels";
import { getRequiredLabels } from "../required_labels";

export type RepositoryLabel = { name: string; color: string; description: string | null };
export type LabelEnsureResult = { created: boolean; existed: boolean };
export type LabelEnsureSummary = { created: number; existing: number; errors: string[] };

export class IssueLabelProvisioningRepository {
    constructor(private readonly githubClient: GithubClientPort<GithubIssueLabelProvisioningClient>) {}
    listLabelsForRepo = async (
        owner: string,
        repository: string,
        token: string,
    ): Promise<RepositoryLabel[]> => {
        const octokit = this.githubClient.getClient(token);
        const { data: labels } = await octokit.rest.issues.listLabelsForRepo({
            owner,
            repo: repository,
            per_page: 100,
        });
        return labels.map(label => ({
            name: label.name,
            color: label.color,
            description: label.description ?? null,
        }));
    };

    createLabel = async (
        owner: string,
        repository: string,
        name: string,
        color: string,
        description: string,
        token: string,
    ): Promise<void> => {
        const octokit = this.githubClient.getClient(token);
        await octokit.rest.issues.createLabel({ owner, repo: repository, name, color, description });
    };

    ensureLabel = async (
        owner: string,
        repository: string,
        name: string,
        color: string,
        description: string,
        token: string,
    ): Promise<LabelEnsureResult> => {
        try {
            if (!name || name.trim().length === 0) {
                logDebugInfo('Skipping label creation: name is undefined or empty');
                return { created: false, existed: false };
            }

            const existingLabels = await this.listLabelsForRepo(owner, repository, token);
            const existingLabelNames = new Set(existingLabels.map(label => label.name.toLowerCase()));
            if (existingLabelNames.has(name.toLowerCase())) {
                return { created: false, existed: true };
            }

            try {
                await this.createLabel(owner, repository, name, color, description, token);
                return { created: true, existed: false };
            } catch (error: unknown) {
                const err = error as { status?: number; message?: string };
                if (err.status === 422 && err.message?.includes('already exists')) {
                    return { created: false, existed: true };
                }
                throw error;
            }
        } catch (error) {
            logError(`Error ensuring label "${name}": ${error}`);
            throw error;
        }
    };

    ensureLabels = async (
        owner: string,
        repository: string,
        labels: Labels,
        token: string,
    ): Promise<LabelEnsureSummary> => {
        const errors: string[] = [];
        let created = 0;
        let existing = 0;

        for (const label of getRequiredLabels(labels)) {
            try {
                const result = await this.ensureLabel(owner, repository, label.name, label.color, label.description, token);
                if (result.created) created++;
                else if (result.existed) existing++;
            } catch (error: unknown) {
                const err = error as { message?: string };
                logError(`Error ensuring label "${label.name}": ${error}`);
                errors.push(`Error creando label "${label.name}": ${err.message || error}`);
            }
        }

        return { created, existing, errors };
    };
}
