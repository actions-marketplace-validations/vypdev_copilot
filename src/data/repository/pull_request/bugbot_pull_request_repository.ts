import type { BugbotPullRequestWritePort } from '../../../application/ports/bugbot_pull_request_write_ports';
import type { BugbotPullRequestReadPort, BugbotPullRequestReviewComment } from '../../../application/ports/bugbot_pull_request_read_ports';
import type { PullRequestChangesRepository } from './pull_request_changes_repository';
import type { PullRequestLifecycleRepository } from './pull_request_lifecycle_repository';
import type { PullRequestReviewRepository } from './pull_request_review_repository';

export class BugbotPullRequestRepository implements BugbotPullRequestReadPort, BugbotPullRequestWritePort {
    constructor(
        private readonly lifecycle: PullRequestLifecycleRepository,
        private readonly changes: PullRequestChangesRepository,
        private readonly review: PullRequestReviewRepository,
    ) {}

    getHeadBranchForIssue = (...args: Parameters<BugbotPullRequestReadPort['getHeadBranchForIssue']>) => this.lifecycle.getHeadBranchForIssue(...args);
    getOpenPullRequestNumbersByHeadBranch = (...args: Parameters<BugbotPullRequestReadPort['getOpenPullRequestNumbersByHeadBranch']>) => this.lifecycle.getOpenPullRequestNumbersByHeadBranch(...args);
    getPullRequestReviewCommentBody = (...args: Parameters<BugbotPullRequestReadPort['getPullRequestReviewCommentBody']>) => this.review.getPullRequestReviewCommentBody(...args);
    listPullRequestReviewComments = (...args: Parameters<BugbotPullRequestReadPort['listPullRequestReviewComments']>): Promise<BugbotPullRequestReviewComment[]> => this.review.listPullRequestReviewComments(...args);
    getPullRequestHeadSha = (...args: Parameters<BugbotPullRequestReadPort['getPullRequestHeadSha']>) => this.changes.getPullRequestHeadSha(...args);
    getChangedFiles = (...args: Parameters<BugbotPullRequestReadPort['getChangedFiles']>) => this.changes.getChangedFiles(...args);
    getFilesWithFirstDiffLine = (...args: Parameters<BugbotPullRequestReadPort['getFilesWithFirstDiffLine']>) => this.changes.getFilesWithFirstDiffLine(...args);
    createReviewWithComments = (...args: Parameters<BugbotPullRequestWritePort['createReviewWithComments']>) => this.review.createReviewWithComments(...args);
    updatePullRequestReviewComment = (...args: Parameters<BugbotPullRequestWritePort['updatePullRequestReviewComment']>) => this.review.updatePullRequestReviewComment(...args);
    resolvePullRequestReviewThread = (...args: Parameters<BugbotPullRequestWritePort['resolvePullRequestReviewThread']>) => this.review.resolvePullRequestReviewThread(...args);
}
