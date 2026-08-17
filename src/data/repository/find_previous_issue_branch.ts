export function findPreviousIssueBranch(
    branchNames: string[],
    issueNumber: number,
    branchTypes: string[],
): string | undefined {
    for (const type of branchTypes) {
        const prefix = `${type}/${issueNumber}-`;
        const matchingBranch = branchNames.find((branch) => branch.includes(prefix));
        if (matchingBranch) return matchingBranch;
    }
    return undefined;
}
