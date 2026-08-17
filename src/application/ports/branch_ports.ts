import type { Labels } from '../../data/model/labels';
import type { Result } from '../../data/model/result';
import type { Execution } from '../../data/model/execution';
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

export interface BranchLifecyclePort extends BranchListQueryPort {
    removeBranch(owner: string, repository: string, branch: string, token: string): Promise<boolean>;
}

export interface BranchNamePort {
    formatBranchName(issueTitle: string, issueNumber: number): string;
}

export interface BranchPreparationPort extends BranchLifecyclePort, BranchNamePort {
    fetchRemoteBranches(): Promise<void>;
    getCommitTag(tag: string | undefined): Promise<string | undefined>;
    createLinkedBranch(owner: string, repository: string, baseBranch: string, newBranch: string, issueNumber: number, oid: string | undefined, token: string): Promise<Result[]>;
    manageBranches(param: Execution, owner: string, repository: string, issueNumber: number, issueTitle: string, branchType: string, developmentBranch: string, hotfixBranch: string | undefined, isHotfix: boolean, token: string): Promise<Result[]>;
}

export interface BranchMergePort {
    mergeBranch(
        owner: string,
        repository: string,
        head: string,
        base: string,
        timeout: number,
        token: string,
    ): Promise<Result[]>;
}
