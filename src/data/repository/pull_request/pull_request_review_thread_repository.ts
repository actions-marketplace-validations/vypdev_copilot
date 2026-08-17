import * as github from "@actions/github";
import { logDebugInfo, logError } from "../../../utils/logger";

type ThreadPageInfo = { hasNextPage: boolean; endCursor: string | null };
type ThreadNode = {
    id: string;
    comments: { nodes: Array<{ id: string }>; pageInfo: ThreadPageInfo };
};
type ThreadsResult = {
    repository?: {
        pullRequest?: {
            reviewThreads?: {
                nodes: ThreadNode[];
                pageInfo: ThreadPageInfo;
            };
        };
    };
};
type ThreadCommentsResult = {
    node?: {
        comments: { nodes: Array<{ id: string }>; pageInfo: ThreadPageInfo };
    };
};

/** GitHub GraphQL adapter for locating and resolving a pull-request review thread. */
export class PullRequestReviewThreadRepository {
    resolve = async (
        owner: string,
        repository: string,
        pullNumber: number,
        commentNodeId: string,
        token: string
    ): Promise<void> => {
        const octokit = github.getOctokit(token);
        try {
            const threadId = await this.findThreadId(
                octokit,
                owner,
                repository,
                pullNumber,
                commentNodeId
            );

            if (!threadId) {
                logError(`[Bugbot] No review thread found for comment node_id=${commentNodeId}.`);
                return;
            }

            await octokit.graphql<{ resolveReviewThread?: { thread?: { id: string } } }>(
                `mutation ($threadId: ID!) {
                    resolveReviewThread(input: { threadId: $threadId }) {
                        thread { id }
                    }
                }`,
                { threadId }
            );
            logDebugInfo(`Resolved PR review thread ${threadId}.`);
        } catch (err) {
            logError(
                `[Bugbot] Error resolving PR review thread (commentNodeId=${commentNodeId}, owner=${owner}, repo=${repository}): ${err}`
            );
        }
    };

    private findThreadId = async (
        octokit: ReturnType<typeof github.getOctokit>,
        owner: string,
        repository: string,
        pullNumber: number,
        commentNodeId: string
    ): Promise<string | null> => {
        let threadId: string | null = null;
        let threadsCursor: string | null = null;

        outer: do {
            const threadsData: ThreadsResult = await octokit.graphql<ThreadsResult>(
                `query ($owner: String!, $repo: String!, $prNumber: Int!, $threadsAfter: String) {
                    repository(owner: $owner, name: $repo) {
                        pullRequest(number: $prNumber) {
                            reviewThreads(first: 100, after: $threadsAfter) {
                                nodes {
                                    id
                                    comments(first: 100) {
                                        nodes { id }
                                        pageInfo { hasNextPage endCursor }
                                    }
                                }
                                pageInfo { hasNextPage endCursor }
                            }
                        }
                    }
                }`,
                { owner, repo: repository, prNumber: pullNumber, threadsAfter: threadsCursor }
            );
            const threads = threadsData?.repository?.pullRequest?.reviewThreads;
            if (!threads?.nodes?.length) break;

            for (const thread of threads.nodes) {
                let commentsCursor: string | null = null;
                let commentNodes = thread.comments?.nodes ?? [];
                let commentsPageInfo = thread.comments?.pageInfo;

                do {
                    if (commentNodes.some((comment) => comment.id === commentNodeId)) {
                        threadId = thread.id;
                        break outer;
                    }
                    if (!commentsPageInfo?.hasNextPage || commentsPageInfo.endCursor == null) break;

                    commentsCursor = commentsPageInfo.endCursor;
                    const nextComments = await octokit.graphql<ThreadCommentsResult>(
                        `query ($threadId: ID!, $commentsAfter: String) {
                            node(id: $threadId) {
                                ... on PullRequestReviewThread {
                                    comments(first: 100, after: $commentsAfter) {
                                        nodes { id }
                                        pageInfo { hasNextPage endCursor }
                                    }
                                }
                            }
                        }`,
                        { threadId: thread.id, commentsAfter: commentsCursor }
                    );
                    commentNodes = nextComments?.node?.comments?.nodes ?? [];
                    commentsPageInfo = nextComments?.node?.comments?.pageInfo ?? {
                        hasNextPage: false,
                        endCursor: null,
                    };
                    if (commentNodes.some((comment) => comment.id === commentNodeId)) {
                        threadId = thread.id;
                        break outer;
                    }
                } while (commentsPageInfo?.hasNextPage === true && commentsPageInfo?.endCursor != null);
            }

            const pageInfo = threads.pageInfo;
            if (threadId != null || !pageInfo?.hasNextPage) break;
            threadsCursor = pageInfo.endCursor ?? null;
        } while (threadsCursor != null);

        return threadId;
    };
}
