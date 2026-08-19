import { OctokitGraphqlTransportClientAdapter, OctokitOwnerTypeClientAdapter, OctokitRepositoryContextClientAdapter } from "../../../infrastructure/github/octokit_client";
import { ProjectBoardCommandRepository } from "./project_board_command_repository";
import { ProjectBoardLinkRepository } from "./project_board_link_repository";
import { ProjectBoardQueryRepository } from "./project_board_query_repository";
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

describe("ProjectBoardQueryRepository", () => {
    const queryRepository = new ProjectBoardQueryRepository(new OctokitRepositoryContextClientAdapter(), new OctokitOwnerTypeClientAdapter(), new OctokitGraphqlTransportClientAdapter());
    const linkRepository = new ProjectBoardLinkRepository(queryRepository, new OctokitGraphqlTransportClientAdapter());
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

        await expect(queryRepository.getProjectDetail("1", "token")).resolves.toMatchObject({
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

        await expect(queryRepository.isContentLinked(project, "content-1", "token")).resolves.toBe(true);
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

        await expect(linkRepository.linkContentId(project, "content-1", "token")).resolves.toBe(false);
        expect(mockGraphql).toHaveBeenCalledTimes(1);
    });
});
