import { RepositoryFactory } from "../repository_factory";

describe("RepositoryFactory", () => {
    it("creates specialized repository adapters through the composition root", () => {
        const factory = new RepositoryFactory();
        expect(factory.createActorAuthorizationRepository()).toBeDefined();
        expect(factory.createIssueAssignmentRepository()).toBeDefined();
        expect(factory.createIssueLabelRepository()).toBeDefined();
    });
});
