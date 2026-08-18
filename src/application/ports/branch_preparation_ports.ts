import type { Execution } from '../../data/model/execution';
import type { Result } from '../../data/model/result';
import type { BranchLifecyclePort, BranchNamePort } from './branch_lifecycle_ports';

export interface BranchPreparationPort extends BranchLifecyclePort, BranchNamePort {
    fetchRemoteBranches(): Promise<void>;
    getCommitTag(tag: string | undefined): Promise<string | undefined>;
    createLinkedBranch(owner: string, repository: string, baseBranch: string, newBranch: string, issueNumber: number, oid: string | undefined, token: string): Promise<Result[]>;
    manageBranches(param: Execution, owner: string, repository: string, issueNumber: number, issueTitle: string, branchType: string, developmentBranch: string, hotfixBranch: string | undefined, isHotfix: boolean, token: string): Promise<Result[]>;
}
