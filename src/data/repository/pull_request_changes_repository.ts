import * as github from "@actions/github";
import { logError } from "../../utils/logger";

export class PullRequestChangesRepository {
    getChangedFiles = async (
        owner: string,
        repository: string,
        pullNumber: number,
        token: string
    ): Promise<{filename: string, status: string}[]> => {
        const octokit = github.getOctokit(token);
        const all: Array<{ filename: string; status: string }> = [];
        try {
            for await (const response of octokit.paginate.iterator(
                octokit.rest.pulls.listFiles,
                {
                    owner,
                    repo: repository,
                    pull_number: pullNumber,
                    per_page: 100,
                }
            )) {
                const data = response.data ?? [];
                all.push(
                    ...data.map((file: { filename: string; status: string }) => ({
                        filename: file.filename,
                        status: file.status,
                    }))
                );
            }
            return all;
        } catch (error) {
            logError(`Error getting changed files from pull request: ${error}.`);
            return [];
        }
    };

    /** First line (right side) of the first hunk per file, for valid review comment placement. */
    private static firstLineFromPatch(patch: string): number | undefined {
        const match = patch.match(/^@@ -\d+,\d+ \+(\d+),\d+ @@/m);
        return match ? parseInt(match[1], 10) : undefined;
    }

    /**
     * Returns for each changed file the first line number that appears in the diff (right side).
     * Used so review comments use a line that GitHub can resolve (avoids "line could not be resolved").
     */
    getFilesWithFirstDiffLine = async (
        owner: string,
        repository: string,
        pullNumber: number,
        token: string
    ): Promise<Array<{ path: string; firstLine: number }>> => {
        const octokit = github.getOctokit(token);
        try {
            const { data } = await octokit.rest.pulls.listFiles({
                owner,
                repo: repository,
                pull_number: pullNumber,
            });
            return (data || [])
                .filter((f) => f.status !== 'removed' && (f.patch ?? '').length > 0)
                .map((f) => {
                    const firstLine = PullRequestChangesRepository.firstLineFromPatch(f.patch ?? '');
                    return { path: f.filename, firstLine: firstLine ?? 1 };
                });
        } catch (error) {
            logError(`Error getting files with diff lines (owner=${owner}, repo=${repository}, pullNumber=${pullNumber}): ${error}.`);
            return [];
        }
    };

    getPullRequestChanges = async (
        owner: string,
        repository: string,
        pullNumber: number,
        token: string
    ): Promise<Array<{
        filename: string,
        status: string,
        additions: number,
        deletions: number,
        patch: string
    }>> => {
        const octokit = github.getOctokit(token);
        const allFiles = [];

        try {
            for await (const response of octokit.paginate.iterator(octokit.rest.pulls.listFiles, {
                owner,
                repo: repository,
                pull_number: pullNumber,
                per_page: 100
            })) {
                const filesData = response.data;
                allFiles.push(...filesData.map((file) => ({
                    filename: file.filename,
                    status: file.status,
                    additions: file.additions,
                    deletions: file.deletions,
                    patch: file.patch || ''
                })));
            }

            return allFiles;
        } catch (error) {
            logError(`Error getting pull request changes: ${error}.`);
            return [];
        }
    };

    /** Head commit SHA of the PR (for creating review). */
    getPullRequestHeadSha = async (
        owner: string,
        repository: string,
        pullNumber: number,
        token: string
    ): Promise<string | undefined> => {
        const octokit = github.getOctokit(token);
        try {
            const { data } = await octokit.rest.pulls.get({
                owner,
                repo: repository,
                pull_number: pullNumber,
            });
            return data.head?.sha;
        } catch (error) {
            logError(`Error getting PR head SHA: ${error}.`);
            return undefined;
        }
    };

}
