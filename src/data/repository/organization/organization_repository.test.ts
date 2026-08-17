import { OrganizationRepository } from "./organization_repository";

const mockGetAuthenticated = jest.fn();
const mockGetByUsername = jest.fn();
const mockCheckMembershipForUser = jest.fn();

jest.mock("@actions/github", () => ({
    getOctokit: jest.fn(() => ({
        rest: {
            users: {
                getAuthenticated: mockGetAuthenticated,
                getByUsername: mockGetByUsername,
            },
            orgs: {
                checkMembershipForUser: mockCheckMembershipForUser,
            },
            teams: {
                list: jest.fn(),
                listMembersInOrg: jest.fn(),
            },
        },
    })),
}));

jest.mock("../../../utils/logger", () => ({
    logDebugInfo: jest.fn(),
    logError: jest.fn(),
}));

describe("OrganizationRepository", () => {
    beforeEach(() => jest.clearAllMocks());

    it("returns the authenticated login", async () => {
        mockGetAuthenticated.mockResolvedValue({ data: { login: "alice" } });

        await expect(new OrganizationRepository().getUserFromToken("token")).resolves.toBe("alice");
    });

    it("allows an organization member to modify files", async () => {
        mockGetByUsername.mockResolvedValue({ data: { type: "Organization" } });
        mockCheckMembershipForUser.mockResolvedValue({ status: 204 });

        await expect(new OrganizationRepository().isActorAllowedToModifyFiles("acme", "alice", "token"))
            .resolves.toBe(true);
    });

    it("denies an organization actor when membership is not found", async () => {
        mockGetByUsername.mockResolvedValue({ data: { type: "Organization" } });
        mockCheckMembershipForUser.mockRejectedValue({ status: 404 });

        await expect(new OrganizationRepository().isActorAllowedToModifyFiles("acme", "outsider", "token"))
            .resolves.toBe(false);
    });
});
