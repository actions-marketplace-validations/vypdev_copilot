import { PullRequestLifecycleRepository } from "./pull_request/pull_request_lifecycle_repository";
import { PullRequestChangesRepository } from "./pull_request/pull_request_changes_repository";
import { PullRequestReviewRepository } from "./pull_request/pull_request_review_repository";

export class PullRequestRepository {

    private readonly lifecycleRepository = new PullRequestLifecycleRepository();
    private readonly changesRepository = new PullRequestChangesRepository();
    private readonly reviewRepository = new PullRequestReviewRepository();

    getOpenPullRequestNumbersByHeadBranch = this.lifecycleRepository.getOpenPullRequestNumbersByHeadBranch;
    getHeadBranchForIssue = this.lifecycleRepository.getHeadBranchForIssue;
    isLinked = this.lifecycleRepository.isLinked;
    updateBaseBranch = this.lifecycleRepository.updateBaseBranch;
    updateDescription = this.lifecycleRepository.updateDescription;

    getChangedFiles = this.changesRepository.getChangedFiles;
    getFilesWithFirstDiffLine = this.changesRepository.getFilesWithFirstDiffLine;
    getPullRequestChanges = this.changesRepository.getPullRequestChanges;
    getPullRequestHeadSha = this.changesRepository.getPullRequestHeadSha;

    getCurrentReviewers = this.reviewRepository.getCurrentReviewers;
    addReviewersToPullRequest = this.reviewRepository.addReviewersToPullRequest;
    listPullRequestReviewComments = this.reviewRepository.listPullRequestReviewComments;
    getPullRequestReviewCommentBody = this.reviewRepository.getPullRequestReviewCommentBody;
    resolvePullRequestReviewThread = this.reviewRepository.resolvePullRequestReviewThread;
    createReviewWithComments = this.reviewRepository.createReviewWithComments;
    updatePullRequestReviewComment = this.reviewRepository.updatePullRequestReviewComment;
}