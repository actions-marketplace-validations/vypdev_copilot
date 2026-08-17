import { PullRequestLifecycleRepository } from "./pull_request/pull_request_lifecycle_repository";
import { PullRequestChangesRepository } from "./pull_request/pull_request_changes_repository";
import { PullRequestReviewRepository } from "./pull_request/pull_request_review_repository";
import type { GithubClientPort, GithubPullRequestChangesClient } from "./github/github_client_port";

export class PullRequestRepository {

    private readonly lifecycleRepository = new PullRequestLifecycleRepository();
    private readonly changesRepository: PullRequestChangesRepository;
    private readonly reviewRepository = new PullRequestReviewRepository();

    constructor(githubClient: GithubClientPort<GithubPullRequestChangesClient>) {
        this.changesRepository = new PullRequestChangesRepository(githubClient);
    }

    getOpenPullRequestNumbersByHeadBranch = this.lifecycleRepository.getOpenPullRequestNumbersByHeadBranch;
    getHeadBranchForIssue = this.lifecycleRepository.getHeadBranchForIssue;
    isLinked = this.lifecycleRepository.isLinked;
    updateBaseBranch = this.lifecycleRepository.updateBaseBranch;
    updateDescription = this.lifecycleRepository.updateDescription;

    getChangedFiles = (...args: Parameters<PullRequestChangesRepository["getChangedFiles"]>) => this.changesRepository.getChangedFiles(...args);
    getFilesWithFirstDiffLine = (...args: Parameters<PullRequestChangesRepository["getFilesWithFirstDiffLine"]>) => this.changesRepository.getFilesWithFirstDiffLine(...args);
    getPullRequestChanges = (...args: Parameters<PullRequestChangesRepository["getPullRequestChanges"]>) => this.changesRepository.getPullRequestChanges(...args);
    getPullRequestHeadSha = (...args: Parameters<PullRequestChangesRepository["getPullRequestHeadSha"]>) => this.changesRepository.getPullRequestHeadSha(...args);

    getCurrentReviewers = this.reviewRepository.getCurrentReviewers;
    addReviewersToPullRequest = this.reviewRepository.addReviewersToPullRequest;
    listPullRequestReviewComments = this.reviewRepository.listPullRequestReviewComments;
    getPullRequestReviewCommentBody = this.reviewRepository.getPullRequestReviewCommentBody;
    resolvePullRequestReviewThread = this.reviewRepository.resolvePullRequestReviewThread;
    createReviewWithComments = this.reviewRepository.createReviewWithComments;
    updatePullRequestReviewComment = this.reviewRepository.updatePullRequestReviewComment;
}