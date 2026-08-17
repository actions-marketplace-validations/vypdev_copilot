import { PullRequestLifecycleRepository } from "../pull_request/pull_request_lifecycle_repository";

const mockList = jest.fn();

jest.mock("@actions/github", () => ({
    getOctokit: jest.fn(() => ({ rest: { pulls: { list: mockList } } })),
}));

describe("PullRequestLifecycleRepository", () => {
    beforeEach(() => jest.clearAllMocks());

    it("lists open pull requests by head branch", async () => {
        mockList.mockResolvedValue({ data: [{ number: 12 }, { number: 34 }] });

        await expect(new PullRequestLifecycleRepository().getOpenPullRequestNumbersByHeadBranch("owner", "repo", "feature/12", "token"))
            .resolves.toEqual([12, 34]);
        expect(mockList).toHaveBeenCalledWith(expect.objectContaining({ head: "owner:feature/12", state: "open" }));
    });
});
