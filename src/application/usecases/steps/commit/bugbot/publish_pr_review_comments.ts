import type { BugbotPullRequestCommentWritePort } from "../../../../../application/ports/bugbot_ports";
import type { Execution } from "../../../../../data/model/execution";
import type { BugbotFinding, BugbotPrContext, ExistingFindingInfo } from "./types";
import { buildCommentBody } from "./marker";
import { resolveFindingPathForPr } from "./path_validation";
import { logInfo } from "../../../../../utils/logger";

type ReviewComment = { path: string; line: number; body: string };
export interface PullRequestReviewCommentPublisherOptions {
    repository: BugbotPullRequestCommentWritePort;
    execution: Execution;
    openPrNumber: number;
    prContext: BugbotPrContext;
    watermark: string;
}

export class PullRequestReviewCommentPublisher {
    private readonly commentsToCreate: ReviewComment[] = [];

    public constructor(private readonly options: PullRequestReviewCommentPublisherOptions) {}

    public async publish(finding: BugbotFinding, existing: ExistingFindingInfo | undefined): Promise<void> {
        const { prContext, openPrNumber, execution } = this.options;
        const path = resolveFindingPathForPr(finding.file, prContext.prFiles);
        if (!path) {
            if (finding.file != null && String(finding.file).trim() !== "") {
                logInfo(
                    `Bugbot finding "${finding.id}" file "${finding.file}" not in PR changed files (${prContext.prFiles.length} files); skipping PR review comment.`
                );
            }
            return;
        }

        const body = `${buildCommentBody(finding, false)}\n\n${this.options.watermark}`;
        const line = finding.line ?? prContext.pathToFirstDiffLine[path] ?? 1;
        if (existing?.prCommentId != null && existing.prNumber === openPrNumber) {
            await this.options.repository.updatePullRequestReviewComment(
                execution.owner,
                execution.repo,
                existing.prCommentId,
                body,
                execution.tokens.token
            );
            return;
        }
        this.commentsToCreate.push({ path, line, body });
    }

    public async flush(): Promise<void> {
        if (this.commentsToCreate.length === 0) return;
        const { repository, execution, openPrNumber, prContext } = this.options;
        await repository.createReviewWithComments(
            execution.owner,
            execution.repo,
            openPrNumber,
            prContext.prHeadSha,
            this.commentsToCreate,
            execution.tokens.token
        );
    }
}
