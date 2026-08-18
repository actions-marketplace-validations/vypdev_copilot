import { OctokitGraphqlClientAdapter, OctokitOwnerTypeClientAdapter, OctokitRepositoryContextClientAdapter } from "../../../infrastructure/github/octokit_client";
import { ProjectBoardRepository } from "./project_board_repository";
import { ProjectDetail } from "../../model/project_detail";

const mockGetByUsername = jest.fn();
const mockGraphql = jest.fn();

jest.mock("@actions/github", () => ({
    getOctokit: jest.fn(() => ({
        rest: { users: { getByUsername: (...args: unknown[]) => mockGetByUsername(...args) } },
        graphql: (...args: unknown[]) => mockGraphql(...args),
    })),
    context: { repo: { owner: "owner" } },
}));

jest.mock("../../../utils/logger", () => ({
    logDebugInfo: jest.fn(),
    logError: jest.fn(),
}));

describe("ProjectBoardRepository", () => {
    const repository = new ProjectBoardRepository(new OctokitRepositoryContextClientAdapter(), new OctokitOwnerTypeClientAdapter(), new OctokitGraphqlClientAdapter());
    const project = new ProjectDetail({
        id: "PVT_1",
        title: "Board",
        url: "https://github.com/orgs/owner/projects/1",
        type: "organization",
        owner: "owner",
        number: 1,
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("loads a ProjectDetail from the GitHub project query", async () => {
        mockGetByUsername.mockResolvedValue({ data: { type: "Organization" } });
        mockGraphql.mockResolvedValue({
            organization: { projectV2: { id: "PVT_1", title: "Board", url: "https://github.com/orgs/owner/projects/1" } },
        });

        await expect(repository.getProjectDetail("1", "token")).resolves.toMatchObject({
            id: "PVT_1",
            title: "Board",
            type: "organization",
        });
    });

    it("reports linked content using paginated project items", async () => {
        mockGraphql.mockResolvedValue({
            node: {
                items: {
                    nodes: [{ content: { id: "content-1" } }],
                    pageInfo: { hasNextPage: false, endCursor: null },
                },
            },
        });

        await expect(repository.isContentLinked(project, "content-1", "token")).resolves.toBe(true);
    });

    it("does not issue a mutation when content is already linked", async () => {
        mockGraphql.mockResolvedValue({
            node: {
                items: {
                    nodes: [{ content: { id: "content-1" } }],
                    pageInfo: { hasNextPage: false, endCursor: null },
                },
            },
        });

        await expect(repository.linkContentId(project, "content-1", "token")).resolves.toBe(false);
        expect(mockGraphql).toHaveBeenCalledTimes(1);
    });
});
