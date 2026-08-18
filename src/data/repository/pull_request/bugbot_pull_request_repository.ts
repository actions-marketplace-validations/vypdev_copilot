import type { BugbotPullRequestCommentWritePort, BugbotPullRequestContextPort, BugbotPullRequestReviewComment } from '../../../application/ports/bugbot_ports';
import type { PullRequestChangesRepository } from './pull_request_changes_repository';
import type { PullRequestLifecycleRepository } from './pull_request_lifecycle_repository';
import type { PullRequestReviewRepository } from './pull_request_review_repository';

export class BugbotPullRequestRepository implements BugbotPullRequestContextPort, BugbotPullRequestCommentWritePort {
    constructor(
        private readonly lifecycle: PullRequestLifecycleRepository,
        private readonly changes: PullRequestChangesRepository,
        private readonly review: PullRequestReviewRepository,
    ) {}

    getHeadBranchForIssue = (...args: Parameters<BugbotPullRequestContextPort['getHeadBranchForIssue']>) => this.lifecycle.getHeadBranchForIssue(...args);
    getOpenPullRequestNumbersByHeadBranch = (...args: Parameters<BugbotPullRequestContextPort['getOpenPullRequestNumbersByHeadBranch']>) => this.lifecycle.getOpenPullRequestNumbersByHeadBranch(...args);
    getPullRequestReviewCommentBody = (...args: Parameters<BugbotPullRequestContextPort['getPullRequestReviewCommentBody']>) => this.review.getPullRequestReviewCommentBody(...args);
    listPullRequestReviewComments = (...args: Parameters<BugbotPullRequestContextPort['listPullRequestReviewComments']>): Promise<BugbotPullRequestReviewComment[]> => this.review.listPullRequestReviewComments(...args);
    getPullRequestHeadSha = (...args: Parameters<BugbotPullRequestContextPort['getPullRequestHeadSha']>) => this.changes.getPullRequestHeadSha(...args);
    getChangedFiles = (...args: Parameters<BugbotPullRequestContextPort['getChangedFiles']>) => this.changes.getChangedFiles(...args);
    getFilesWithFirstDiffLine = (...args: Parameters<BugbotPullRequestContextPort['getFilesWithFirstDiffLine']>) => this.changes.getFilesWithFirstDiffLine(...args);
    createReviewWithComments = (...args: Parameters<BugbotPullRequestCommentWritePort['createReviewWithComments']>) => this.review.createReviewWithComments(...args);
    updatePullRequestReviewComment = (...args: Parameters<BugbotPullRequestCommentWritePort['updatePullRequestReviewComment']>) => this.review.updatePullRequestReviewComment(...args);
    resolvePullRequestReviewThread = (...args: Parameters<BugbotPullRequestCommentWritePort['resolvePullRequestReviewThread']>) => this.review.resolvePullRequestReviewThread(...args);
}
