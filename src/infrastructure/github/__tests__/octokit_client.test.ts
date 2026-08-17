import { OctokitClientAdapter } from "../octokit_client";

describe("OctokitClientAdapter", () => {
    it("delegates client creation to the GitHub SDK", () => {
        const adapter = new OctokitClientAdapter();
        expect(adapter.getClient("[REDACTED]")).toBeDefined();
    });
});
