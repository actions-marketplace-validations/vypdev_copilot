import { IssueRepository } from "../../../../../data/repository/issue_repository";
import type { Execution } from "../../../../../data/model/execution";
import { logDebugInfo } from "../../../../../utils/logger";

type IssueCommentRepository = Pick<IssueRepository, "addComment">;

export async function publishOverflowComment(
    repository: IssueCommentRepository,
    execution: Execution,
    overflowCount: number,
    overflowTitles: string[],
    commitSha: string | undefined
): Promise<void> {
    if (overflowCount <= 0) return;

    const titlesList = overflowTitles.length > 0
        ? `\n- ${overflowTitles.slice(0, 15).join("\n- ")}${overflowTitles.length > 15 ? `\n- ... and ${overflowTitles.length - 15} more` : ""}`
        : "";
    const body = `## More findings (comment limit)

There are **${overflowCount}** more finding(s) that were not published as individual comments. Review locally or in the full diff to see the list.${titlesList}`;

    await repository.addComment(
        execution.owner,
        execution.repo,
        execution.issueNumber,
        body,
        execution.tokens.token,
        commitSha ? { commitSha } : undefined
    );
    logDebugInfo(`Added overflow comment: ${overflowCount} additional finding(s) not published individually.`);
}
