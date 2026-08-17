import { PullRequestLifecycleRepository } from "./pull_request/pull_request_lifecycle_repository";
import { PullRequestChangesRepository } from "./pull_request/pull_request_changes_repository";
import { PullRequestReviewRepository } from "./pull_request/pull_request_review_repository";
import type { GithubClientPort, GithubGraphqlClient, GithubPullRequestChangesClient } from "./github/github_client_port";

export class PullRequestRepository {

    private readonly lifecycleRepository = new PullRequestLifecycleRepository();
    private readonly changesRepository: PullRequestChangesRepository;
    private readonly reviewRepository: PullRequestReviewRepository;

    constructor(
        githubClient: GithubClientPort<GithubPullRequestChangesClient>,
        graphqlClient: GithubClientPort<GithubGraphqlClient>,
    ) {
        this.changesRepository = new PullRequestChangesRepository(githubClient);
        this.reviewRepository = new PullRequestReviewRepository(graphqlClient);
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

    getCurrentReviewers = (...args: Parameters<PullRequestReviewRepository["getCurrentReviewers"]>) => this.reviewRepository.getCurrentReviewers(...args);
    addReviewersToPullRequest = (...args: Parameters<PullRequestReviewRepository["addReviewersToPullRequest"]>) => this.reviewRepository.addReviewersToPullRequest(...args);
    listPullRequestReviewComments = (...args: Parameters<PullRequestReviewRepository["listPullRequestReviewComments"]>) => this.reviewRepository.listPullRequestReviewComments(...args);
    getPullRequestReviewCommentBody = (...args: Parameters<PullRequestReviewRepository["getPullRequestReviewCommentBody"]>) => this.reviewRepository.getPullRequestReviewCommentBody(...args);
    resolvePullRequestReviewThread = (...args: Parameters<PullRequestReviewRepository["resolvePullRequestReviewThread"]>) => this.reviewRepository.resolvePullRequestReviewThread(...args);
    createReviewWithComments = (...args: Parameters<PullRequestReviewRepository["createReviewWithComments"]>) => this.reviewRepository.createReviewWithComments(...args);
    updatePullRequestReviewComment = (...args: Parameters<PullRequestReviewRepository["updatePullRequestReviewComment"]>) => this.reviewRepository.updatePullRequestReviewComment(...args);
}