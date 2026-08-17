import type { Labels } from '../../data/model/labels';
import type { SizeThresholds } from '../../data/model/size_thresholds';

export interface LatestTagQueryPort {
    getLatestTag(): Promise<string | undefined>;
}

export interface BranchChangeSizePort {
    getSizeCategoryAndReason(
        owner: string,
        repository: string,
        head: string,
        base: string,
        sizeThresholds: SizeThresholds,
        labels: Labels,
        token: string,
    ): Promise<{ size: string; githubSize: string; reason: string }>;
}

export interface BranchListQueryPort {
    getListOfBranches(owner: string, repository: string, token: string): Promise<string[]>;
}
