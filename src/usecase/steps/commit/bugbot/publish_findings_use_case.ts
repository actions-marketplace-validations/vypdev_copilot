/**
 * Orchestrates publication of bugbot findings to issue comments and PR review comments.
 * Issue publication, PR review policy, and overflow reporting live in dedicated collaborators.
 */

import type { Execution } from "../../../../data/model/execution";
import { IssueRepository } from "../../../../data/repository/issue_repository";
import { PullRequestRepository } from "../../../../data/repository/pull_request_repository";
import { getCommentWatermark } from "../../../../utils/comment_watermark";
import type { BugbotContext, BugbotFinding } from "./types";
import { publishIssueFindingComment } from "./publish_issue_finding_comment";
import { PullRequestReviewCommentPublisher } from "./publish_pr_review_comments";
import { publishOverflowComment } from "./publish_overflow_comment";

export interface PublishFindingsParam {
    execution: Execution;
    context: BugbotContext;
    findings: BugbotFinding[];
    /** Commit SHA for bugbot watermark (commit link). When set, comment uses "for commit ..." watermark. */
    commitSha?: string;
    /** When findings were limited by max comments, add one summary comment with this overflow info. */
    overflowCount?: number;
    overflowTitles?: string[];
}

export async function publishFindings(param: PublishFindingsParam): Promise<void> {
    const { execution, context, findings, commitSha, overflowCount = 0, overflowTitles = [] } = param;
    const { existingByFindingId, openPrNumbers, prContext } = context;
    const issueRepository = new IssueRepository();
    const pullRequestRepository = new PullRequestRepository();
    const watermark =
        commitSha && execution.owner && execution.repo
            ? getCommentWatermark({ commitSha, owner: execution.owner, repo: execution.repo })
            : getCommentWatermark();

    const reviewPublisher =
        prContext && openPrNumbers.length > 0
            ? new PullRequestReviewCommentPublisher({
                  repository: pullRequestRepository,
                  execution,
                  openPrNumber: openPrNumbers[0],
                  prContext,
                  watermark,
              })
            : undefined;

    for (const finding of findings) {
        await publishIssueFindingComment(
            issueRepository,
            execution,
            finding,
            existingByFindingId[finding.id],
            commitSha
        );
        if (reviewPublisher) {
            await reviewPublisher.publish(finding, existingByFindingId[finding.id]);
        }
    }

    await reviewPublisher?.flush();
    await publishOverflowComment(
        issueRepository,
        execution,
        overflowCount,
        overflowTitles,
        commitSha
    );
}
