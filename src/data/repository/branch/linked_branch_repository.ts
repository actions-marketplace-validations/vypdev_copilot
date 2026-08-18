import type { GithubClientPort, GithubGraphqlTransportClient } from '../../../application/ports/github_provider_ports';
import { Result } from '../../model/result';
import { LinkedBranchResponse } from '../../graph/linked_branch_response';
import { RepositoryResponse } from '../../graph/repository_response';
import { logDebugInfo, logError } from '../../../utils/logger';

export class LinkedBranchRepository {
    constructor(private readonly graphqlClient: GithubClientPort<GithubGraphqlTransportClient>) {}

    createLinkedBranch = async (
        owner: string,
        repo: string,
        baseBranchName: string,
        newBranchName: string,
        issueNumber: number,
        oid: string | undefined,
        token: string,
    ): Promise<Result[]> => {
        const result: Result[] = []
        try {
            logDebugInfo(`Creating linked branch ${newBranchName} from ${oid ?? baseBranchName}`)

            let ref = `heads/${baseBranchName}`;
            if (baseBranchName.indexOf('tags/') > -1) {
                ref = baseBranchName;
            }
            const refForGraphQL = ref.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

            const {repository} = await this.graphqlClient.getClient(token).graphql<RepositoryResponse>(`
              query($repo: String!, $owner: String!, $issueNumber: Int!) {
                repository(name: $repo, owner: $owner) {
                  id
                  issue(number: $issueNumber) {
                    id
                  }
                  ref(qualifiedName: "refs/${refForGraphQL}") {
                    target {
                      ... on Commit {
                        oid
                      }
                    }
                  }
                }
              }
            `, {
                repo: repo,
                owner: owner,
                issueNumber: issueNumber
            });

            logDebugInfo(`Repository information retrieved: ${JSON.stringify(repository?.ref)}`)

            const repositoryId: string | undefined = repository?.id ?? undefined;
            const issueId: string | undefined = repository?.issue?.id ?? undefined;
            const branchOid: string | undefined = oid ?? repository?.ref?.target?.oid ?? undefined;

            if (repositoryId === undefined || issueId === undefined || branchOid === undefined) {
                logError(`Error searching repository "${baseBranchName}": id: ${repositoryId}, issue: ${issueId}, oid: ${branchOid}), issue #${issueNumber}`);
                result.push(
                    new Result({
                        id: 'branch_repository',
                        success: false,
                        executed: true,
                        steps: [
                            `Error linking branch ${newBranchName} to issue: Repository not found.`,
                        ],
                    })
                )
                return result;
            }

            logDebugInfo(`Linking branch "${newBranchName}" (oid: ${branchOid}) to issue #${issueNumber}`);

            const mutationResponse = await this.graphqlClient.getClient(token).graphql<LinkedBranchResponse>(`
                mutation($issueId: ID!, $name: String!, $repositoryId: ID!, $oid: GitObjectID!) {
                  createLinkedBranch(input: {
                    issueId: $issueId,
                    name: $name,
                    repositoryId: $repositoryId,
                    oid: $oid,
                  }) {
                    linkedBranch {
                      id
                      ref {
                        name
                      }
                    }
                  }
                }
              `, {
                issueId: issueId,
                name: `/${newBranchName}`,
                repositoryId: repositoryId,
                oid: branchOid,
            });

            logDebugInfo(`Linked branch: ${JSON.stringify(mutationResponse.createLinkedBranch?.linkedBranch)}`);

            const baseBranchUrl = `https://github.com/${owner}/${repo}/tree/${baseBranchName}`;
            const newBranchUrl = `https://github.com/${owner}/${repo}/tree/${newBranchName}`;
            result.push(
                new Result({
                    id: 'branch_repository',
                    success: true,
                    executed: true,
                    payload: {
                        baseBranchName: baseBranchName,
                        baseBranchUrl: baseBranchUrl,
                        newBranchName: newBranchName,
                        newBranchUrl: newBranchUrl,
                    },
                })
            )
        } catch (error) {
            logError(`Error Linking branch "${error}"`);
            result.push(
                new Result({
                    id: 'branch_repository',
                    success: false,
                    executed: true,
                    steps: [
                        `Tried to link branch to the issue, but there was a problem.`,
                    ],
                    error: error,
                })
            )
        }
        return result;
    };
}
