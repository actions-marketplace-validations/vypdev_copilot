import type { GithubBranchClient } from '../../../application/ports/github_branch_ports';
import type { GithubClientPort } from '../../../infrastructure/github/ports/github_client_provider_port';
import type { BranchPreparationPort } from '../../../application/ports/branch_preparation_ports';
import type { Execution } from '../../model/execution';
import { Result } from '../../model/result';
import { GitCliRepository } from '../git_cli_repository';
import { BranchNameRepository } from '../branch_name_repository';
import { LinkedBranchRepository } from './linked_branch_repository';
import { findPreviousIssueBranch } from '../find_previous_issue_branch';
import { logDebugInfo, logError } from '../../../utils/logger';

export class BranchPreparationRepository implements BranchPreparationPort {
    constructor(
        private readonly branchClient: GithubClientPort<GithubBranchClient>,
        private readonly branchNameRepository: BranchNameRepository,
        private readonly linkedBranchRepository: LinkedBranchRepository,
        private readonly gitCliRepository: GitCliRepository,
    ) {}

    fetchRemoteBranches = async (): Promise<void> => this.gitCliRepository.fetchRemoteBranches();
    getCommitTag = async (latestTag: string | undefined): Promise<string | undefined> => this.gitCliRepository.getCommitTag(latestTag);

    getListOfBranches = async (
        owner: string,
        repository: string,
        token: string
    ): Promise<string[]> => {
        const octokit = this.branchClient.getClient(token);
        const allBranches = [];
        let page = 1;
        
        while (true) {
            const {data} = await octokit.rest.repos.listBranches({
                owner: owner,
                repo: repository,
                per_page: 100,
                page: page,
            });
            
            if (data.length === 0) {
                break;
            }
            
            allBranches.push(...data.map(branch => branch.name));
            page++;
        }
        
        return allBranches;
    };

    formatBranchName = (issueTitle: string, issueNumber: number): string => this.branchNameRepository.formatBranchName(issueTitle, issueNumber);

    manageBranches = async (
        param: Execution,
        owner: string,
        repository: string,
        issueNumber: number,
        issueTitle: string,
        branchType: string,
        developmentBranch: string,
        hotfixBranch: string | undefined,
        isHotfix: boolean,
        token: string,
    ): Promise<Result[]> => {
        const result: Result[] = []
        try {
            logDebugInfo(`Managing branches`);

            const branches = await this.getListOfBranches(owner, repository, token)
            logDebugInfo(JSON.stringify(branches, null, 2));

            if (hotfixBranch === undefined && isHotfix) {
                result.push(
                    new Result({
                        id: 'branch_repository',
                        success: false,
                        executed: true,
                        steps: [
                            `Tried to prepare the hotfix branch of the issue, but hotfix branch was not found.`,
                        ],
                    })
                )
                return result
            }

            const octokit = this.branchClient.getClient(token);

            const sanitizedTitle = this.branchNameRepository.formatBranchName(issueTitle, issueNumber);

            const newBranchName = `${branchType}/${issueNumber}-${sanitizedTitle}`;
            if (branches.indexOf(newBranchName) > -1) {
                result.push(
                    new Result({
                        id: 'branch_repository',
                        success: true,
                        executed: false,
                    })
                );
                return result;
            }

            const branchTypes = [
                param.branches.featureTree,
                param.branches.bugfixTree,
                param.branches.docsTree,
                param.branches.choreTree,
            ];

            /**
             * Default base branch name. (ex. [develop])
             */
            let baseBranchName = developmentBranch;

            let isRenamingBranch = false;
            if (!isHotfix) {
                /**
                 * Check if it is a branch switch: feature/123-bla <-> bugfix/123-bla
                 */
                logDebugInfo(`Searching for branches related to issue #${issueNumber}...`);

                const {data} = await octokit.rest.repos.listBranches({
                    owner: owner,
                    repo: repository,
                });

                const previousBranch = findPreviousIssueBranch(
                    data.map((branch) => branch.name),
                    issueNumber,
                    branchTypes,
                );
                if (previousBranch) {
                    baseBranchName = previousBranch;
                    isRenamingBranch = true;
                    logDebugInfo(`Found previous issue branch: ${baseBranchName}`);
                }
            } else {
                baseBranchName = hotfixBranch ?? developmentBranch;
            }

            if (!isRenamingBranch || param.currentConfiguration.parentBranch === undefined) {
                param.currentConfiguration.parentBranch = baseBranchName;
            }

            logDebugInfo(`============================================================================================`);
            logDebugInfo(`Base branch: ${baseBranchName}`);
            logDebugInfo(`New branch: ${newBranchName}`);

            result.push(
                ...await this.linkedBranchRepository.createLinkedBranch(
                    owner,
                    repository,
                    baseBranchName,
                    newBranchName,
                    issueNumber,
                    undefined,
                    token
                )
            )
        } catch (error) {
            logError(error);
            result.push(
                new Result({
                    id: 'branch_repository',
                    success: false,
                    executed: true,
                    steps: [
                        `Tried to prepare the hotfix to the issue, but there was a problem.`,
                    ],
                    error: error,
                })
            )
        }
        return result;
    };

    createLinkedBranch = (...args: Parameters<LinkedBranchRepository['createLinkedBranch']>) => this.linkedBranchRepository.createLinkedBranch(...args);

    removeBranch = async (owner: string, repository: string, branch: string, token: string): Promise<boolean> => {
        const octokit = this.branchClient.getClient(token);
        const ref = `heads/${branch}`;
        try {
            await octokit.rest.git.getRef({ owner, repo: repository, ref });
            await octokit.rest.git.deleteRef({ owner, repo: repository, ref });
            return true;
        } catch (error) {
            logError(`Error processing branch ${branch}: ${error}`);
            throw error;
        }
    };
}
