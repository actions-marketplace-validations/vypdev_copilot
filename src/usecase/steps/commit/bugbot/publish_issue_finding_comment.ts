import { IssueRepository } from "../../../../data/repository/issue_repository";
import type { Execution } from "../../../../data/model/execution";
import type { BugbotFinding, ExistingFindingInfo } from "./types";
import { buildCommentBody } from "./marker";
import { logDebugInfo } from "../../../../utils/logger";

type IssueCommentRepository = Pick<IssueRepository, "addComment" | "updateComment">;

export async function publishIssueFindingComment(
    repository: IssueCommentRepository,
    execution: Execution,
    finding: BugbotFinding,
    existing: ExistingFindingInfo | undefined,
    commitSha: string | undefined
): Promise<void> {
    const body = buildCommentBody(finding, false);
    const options = commitSha ? { commitSha } : undefined;

    if (existing?.issueCommentId != null) {
        await repository.updateComment(
            execution.owner,
            execution.repo,
            execution.issueNumber,
            existing.issueCommentId,
            body,
            execution.tokens.token,
            options
        );
        logDebugInfo(`Updated bugbot comment for finding ${finding.id} on issue.`);
        return;
    }

    await repository.addComment(
        execution.owner,
        execution.repo,
        execution.issueNumber,
        body,
        execution.tokens.token,
        options
    );
    logDebugInfo(`Added bugbot comment for finding ${finding.id} on issue.`);
}
