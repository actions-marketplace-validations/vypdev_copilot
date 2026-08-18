import { RepositoryFactory } from "../repository_factory";

describe("RepositoryFactory", () => {
    it("creates specialized repository adapters through the composition root", () => {
        const factory = new RepositoryFactory();
        expect(factory.createOrganizationMembersRepository()).toBeDefined();
        expect(factory.createAuthenticatedUserRepository()).toBeDefined();
        expect(factory.createActorAuthorizationRepository()).toBeDefined();
        expect(factory.createIssueRepository()).toBeDefined();
        expect(factory.createIssueAssignmentRepository()).toBeDefined();
        expect(factory.createIssueContentRepository()).toBeDefined();
        expect(factory.createIssueLabelRepository()).toBeDefined();
        expect(factory.createIssueLabelProvisioningRepository()).toBeDefined();
        expect(factory.createIssueLifecycleRepository()).toBeDefined();
        expect(factory.createIssueMetadataRepository()).toBeDefined();
        expect(factory.createIssueProgressLabelRepository()).toBeDefined();
        expect(factory.createIssueTypeRepository()).toBeDefined();
        expect(factory.createProjectBoardRepository()).toBeDefined();
        expect(factory.createPullRequestChangesRepository()).toBeDefined();
        expect(factory.createPullRequestLifecycleRepository()).toBeDefined();
        expect(factory.createPullRequestReviewRepository()).toBeDefined();
        expect(factory.createPullRequestReviewThreadRepository()).toBeDefined();
        expect(factory.createRepositoryReleaseRepository()).toBeDefined();
    });
});
