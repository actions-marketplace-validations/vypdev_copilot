import { logDebugInfo, logError } from '../../utils/logger';
import { IssueLabelRepository } from './issue/issue_label_repository';
import {
    PROGRESS_LABEL_PATTERN,
    PROGRESS_LABEL_PERCENTS,
    progressPercentToColor,
} from './progress_labels';

export interface EnsureLabelResult {
    created: boolean;
    existed: boolean;
}

export type EnsureLabel = (
    owner: string,
    repository: string,
    name: string,
    color: string,
    description: string,
    token: string,
) => Promise<EnsureLabelResult>;

export class IssueProgressLabelRepository {
    constructor(private readonly issueLabelRepository: IssueLabelRepository) {}

    ensureProgressLabels = async (
        owner: string,
        repository: string,
        token: string,
        ensureLabel: EnsureLabel,
    ): Promise<{ created: number; existing: number; errors: string[] }> => {
        const errors: string[] = [];
        let created = 0;
        let existing = 0;
        for (const percent of PROGRESS_LABEL_PERCENTS) {
            const name = `${percent}%`;
            try {
                const result = await ensureLabel(
                    owner,
                    repository,
                    name,
                    progressPercentToColor(percent),
                    `Progress: ${percent}%`,
                    token,
                );
                if (result.created) created++;
                else if (result.existed) existing++;
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : String(error);
                logError(`Error ensuring progress label "${name}": ${message}`);
                errors.push(`Error creating label "${name}": ${message}`);
            }
        }
        return { created, existing, errors };
    };

    setProgressLabel = async (
        owner: string,
        repository: string,
        issueNumber: number,
        progress: number,
        token: string,
    ): Promise<void> => {
        const rounded = Math.min(100, Math.max(0, Math.round(progress / 5) * 5));
        const newLabel = `${rounded}%`;
        const current = await this.issueLabelRepository.getLabels(owner, repository, issueNumber, token);
        const withoutProgress = current.filter(name => !PROGRESS_LABEL_PATTERN.test(name));
        const nextLabels = withoutProgress.includes(newLabel)
            ? withoutProgress
            : [...withoutProgress, newLabel];
        await this.issueLabelRepository.setLabels(owner, repository, issueNumber, nextLabels, token);
        logDebugInfo(`Progress label set to ${newLabel} for issue #${issueNumber}`);
    };
}
