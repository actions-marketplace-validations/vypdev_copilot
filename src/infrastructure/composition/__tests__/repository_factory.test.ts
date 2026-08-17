import { RepositoryFactory } from "../repository_factory";

describe("RepositoryFactory", () => {
    it("creates specialized repository adapters through the composition root", () => {
        const factory = new RepositoryFactory();
        expect(factory.createOrganizationRepository()).toBeDefined();
        expect(factory.createIssueRepository()).toBeDefined();
        expect(factory.createProjectBoardRepository()).toBeDefined();
        expect(factory.createPullRequestChangesRepository()).toBeDefined();
        expect(factory.createPullRequestLifecycleRepository()).toBeDefined();
        expect(factory.createPullRequestReviewRepository()).toBeDefined();
        expect(factory.createPullRequestReviewThreadRepository()).toBeDefined();
        expect(factory.createRepositoryReleaseRepository()).toBeDefined();
    });
});
