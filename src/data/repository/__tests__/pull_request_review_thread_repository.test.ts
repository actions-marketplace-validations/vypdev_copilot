import { PullRequestReviewThreadRepository } from "../pull_request/pull_request_review_thread_repository";

jest.mock("../../../utils/logger", () => ({
    logDebugInfo: jest.fn(),
    logError: jest.fn(),
}));

const mockGraphql = jest.fn();
jest.mock("@actions/github", () => ({
    getOctokit: () => ({
        graphql: (...args: unknown[]) => mockGraphql(...args),
    }),
}));

describe("PullRequestReviewThreadRepository", () => {
    const repository = new PullRequestReviewThreadRepository();

    beforeEach(() => {
        mockGraphql.mockReset();
    });

    it("resolves the thread containing the requested comment", async () => {
        mockGraphql
            .mockResolvedValueOnce({
                repository: {
                    pullRequest: {
                        reviewThreads: {
                            nodes: [
                                {
                                    id: "THREAD_1",
                                    comments: {
                                        nodes: [{ id: "COMMENT_1" }],
                                        pageInfo: { hasNextPage: false, endCursor: null },
                                    },
                                },
                            ],
                            pageInfo: { hasNextPage: false, endCursor: null },
                        },
                    },
                },
            })
            .mockResolvedValueOnce({ resolveReviewThread: { thread: { id: "THREAD_1" } } });

        await repository.resolve("owner", "repo", 7, "COMMENT_1", "token");

        expect(mockGraphql).toHaveBeenCalledTimes(2);
        expect(mockGraphql.mock.calls[1][1]).toEqual({ threadId: "THREAD_1" });
    });

    it("paginates thread comments before deciding that the comment is absent", async () => {
        mockGraphql
            .mockResolvedValueOnce({
                repository: {
                    pullRequest: {
                        reviewThreads: {
                            nodes: [
                                {
                                    id: "THREAD_1",
                                    comments: {
                                        nodes: [{ id: "OTHER" }],
                                        pageInfo: { hasNextPage: true, endCursor: "COMMENTS_1" },
                                    },
                                },
                            ],
                            pageInfo: { hasNextPage: false, endCursor: null },
                        },
                    },
                },
            })
            .mockResolvedValueOnce({
                node: {
                    comments: {
                        nodes: [{ id: "COMMENT_2" }],
                        pageInfo: { hasNextPage: false, endCursor: null },
                    },
                },
            })
            .mockResolvedValueOnce({ resolveReviewThread: { thread: { id: "THREAD_1" } } });

        await repository.resolve("owner", "repo", 7, "COMMENT_2", "token");

        expect(mockGraphql).toHaveBeenCalledTimes(3);
        expect(mockGraphql.mock.calls[1][1]).toEqual({
            threadId: "THREAD_1",
            commentsAfter: "COMMENTS_1",
        });
    });

    it("does not throw when GraphQL fails", async () => {
        mockGraphql.mockRejectedValue(new Error("GraphQL unavailable"));

        await expect(repository.resolve("owner", "repo", 7, "COMMENT_1", "token")).resolves.toBeUndefined();
        expect(mockGraphql).toHaveBeenCalledTimes(1);
    });
});
