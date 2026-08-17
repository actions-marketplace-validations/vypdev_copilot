import * as github from "@actions/github";
import { PullRequestReviewThreadRepository } from "./pull_request_review_thread_repository";
import { logDebugInfo, logError } from "../../../utils/logger";
import type { GithubClientPort, GithubGraphqlClient } from "../github/github_client_port";

export class PullRequestReviewRepository {
    constructor(githubClient: GithubClientPort<GithubGraphqlClient>) {
        this.pullRequestReviewThreadRepository = new PullRequestReviewThreadRepository(githubClient);
    }
    /**
     * Returns all users involved in review: requested (pending) + those who already submitted a review.
     * Used to avoid re-requesting someone who already reviewed when ensuring desired reviewer count.
     */
    getCurrentReviewers = async (
        owner: string,
        repository: string,
        pullNumber: number,
        token: string
    ): Promise<string[]> => {
        const octokit = github.getOctokit(token);

        try {
            const [requestedRes, reviewsRes] = await Promise.all([
                octokit.rest.pulls.listRequestedReviewers({
                    owner,
                    repo: repository,
                    pull_number: pullNumber,
                }),
                octokit.rest.pulls.listReviews({
                    owner,
                    repo: repository,
                    pull_number: pullNumber,
                }),
            ]);

            const logins = new Set<string>();
            for (const user of requestedRes.data.users) {
                logins.add(user.login);
            }
            for (const review of reviewsRes.data) {
                if (review.user?.login) {
                    logins.add(review.user.login);
                }
            }
            return Array.from(logins);
        } catch (error) {
            logError(`Error getting reviewers of PR: ${error}.`);
            return [];
        }
    };

    addReviewersToPullRequest = async (
        owner: string,
        repository: string,
        pullNumber: number,
        reviewers: string[],
        token: string
    ): Promise<string[]> => {
        const octokit = github.getOctokit(token);

        try {
            if (reviewers.length === 0) {
                logDebugInfo(`No reviewers provided for addition. Skipping operation.`);
                return [];
            }

            const {data} = await octokit.rest.pulls.requestReviewers({
                owner,
                repo: repository,
                pull_number: pullNumber,
                reviewers: reviewers,
            });

            const addedReviewers = data.requested_reviewers || [];
            return addedReviewers.map((reviewer) => reviewer.login);
        } catch (error) {
            logError(`Error adding reviewers to pull request: ${error}.`);
            return [];
        }
    };


    /**
     * List all review comments on a PR (for bugbot: find existing findings by marker).
     * Uses pagination to fetch every comment (default API returns only 30 per page).
     * Includes node_id for GraphQL (e.g. resolve review thread).
     */
    listPullRequestReviewComments = async (
        owner: string,
        repository: string,
        pullNumber: number,
        token: string
    ): Promise<Array<{ id: number; body: string | null; path?: string; line?: number; node_id?: string }>> => {
        const octokit = github.getOctokit(token);
        const all: Array<{ id: number; body: string | null; path?: string; line?: number; node_id?: string }> = [];
        try {
            for await (const response of octokit.paginate.iterator(octokit.rest.pulls.listReviewComments, {
                owner,
                repo: repository,
                pull_number: pullNumber,
                per_page: 100,
            })) {
                const data = response.data || [];
                all.push(
                    ...data.map((c: { id: number; body: string | null; path?: string; line?: number; node_id?: string }) => ({
                        id: c.id,
                        body: c.body ?? null,
                        path: c.path,
                        line: c.line ?? undefined,
                        node_id: c.node_id ?? undefined,
                    }))
                );
            }
            return all;
        } catch (error) {
            logError(`Error listing PR review comments (owner=${owner}, repo=${repository}, pullNumber=${pullNumber}): ${error}.`);
            return [];
        }
    };

    /**
     * Fetches a single PR review comment by id (e.g. parent comment when user replied in thread).
     * Returns the comment body or null if not found.
     */
    getPullRequestReviewCommentBody = async (
        owner: string,
        repository: string,
        _pullNumber: number,
        commentId: number,
        token: string
    ): Promise<string | null> => {
        const octokit = github.getOctokit(token);
        try {
            const { data } = await octokit.rest.pulls.getReviewComment({
                owner,
                repo: repository,
                comment_id: commentId,
            });
            return data.body ?? null;
        } catch (error) {
            logError(`Error getting PR review comment ${commentId}: ${error}`);
            return null;
        }
    };

    private readonly pullRequestReviewThreadRepository: PullRequestReviewThreadRepository;

    /** Resolve a PR review thread containing the given review comment node. */
    resolvePullRequestReviewThread = async (
        owner: string,
        repository: string,
        pullNumber: number,
        commentNodeId: string,
        token: string
    ): Promise<void> => {
        await this.pullRequestReviewThreadRepository.resolve(
            owner,
            repository,
            pullNumber,
            commentNodeId,
            token
        );
    };

    /**
     * Create a review on the PR with one or more inline comments (bugbot findings).
     * Each comment requires path and line (use first file and line 1 if not specified).
     */
    createReviewWithComments = async (
        owner: string,
        repository: string,
        pullNumber: number,
        commitId: string,
        comments: Array<{ path: string; line: number; body: string }>,
        token: string
    ): Promise<void> => {
        if (comments.length === 0) return;
        const octokit = github.getOctokit(token);
        const results = await Promise.allSettled(
            comments.map((c) =>
                octokit.rest.pulls.createReviewComment({
                    owner,
                    repo: repository,
                    pull_number: pullNumber,
                    commit_id: commitId,
                    path: c.path,
                    line: c.line,
                    side: 'RIGHT',
                    body: c.body,
                })
            )
        );
        let created = 0;
        results.forEach((result, i) => {
            if (result.status === 'fulfilled') {
                created += 1;
            } else {
                const c = comments[i];
                logError(
                    `[Bugbot] Error creating PR review comment. path="${c.path}", line=${c.line}, prNumber=${pullNumber}, owner=${owner}, repo=${repository}: ${result.reason}`
                );
            }
        });
        if (created > 0) {
            logDebugInfo(`Created ${created} review comment(s) on PR #${pullNumber}.`);
        }
    };

    /** Update an existing PR review comment (e.g. to mark finding as resolved in body). */
    updatePullRequestReviewComment = async (
        owner: string,
        repository: string,
        commentId: number,
        body: string,
        token: string
    ): Promise<void> => {
        const octokit = github.getOctokit(token);
        await octokit.rest.pulls.updateReviewComment({
            owner,
            repo: repository,
            comment_id: commentId,
            body,
        });
        logDebugInfo(`Updated review comment ${commentId}.`);
    };
}
