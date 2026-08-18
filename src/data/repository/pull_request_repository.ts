import { PullRequestLifecycleRepository } from "./pull_request/pull_request_lifecycle_repository";
import { PullRequestChangesRepository } from "./pull_request/pull_request_changes_repository";
import { PullRequestReviewRepository } from "./pull_request/pull_request_review_repository";
import type { GithubClientPort, GithubGraphqlClient, GithubPullRequestChangesClient, GithubPullRequestLifecycleClient, GithubPullRequestReviewClient } from "../../application/ports/github_provider_ports";

export class PullRequestRepository {

    private readonly lifecycleRepository: PullRequestLifecycleRepository;
    private readonly changesRepository: PullRequestChangesRepository;
    private readonly reviewRepository: PullRequestReviewRepository;

    constructor(
        githubClient: GithubClientPort<GithubPullRequestChangesClient>,
        graphqlClient: GithubClientPort<GithubGraphqlClient>,
        reviewClient: GithubClientPort<GithubPullRequestReviewClient>,
        lifecycleClient: GithubClientPort<GithubPullRequestLifecycleClient>,
    ) {
        this.lifecycleRepository = new PullRequestLifecycleRepository(lifecycleClient);
        this.changesRepository = new PullRequestChangesRepository(githubClient);
        this.reviewRepository = new PullRequestReviewRepository(reviewClient, graphqlClient);
    }

    getOpenPullRequestNumbersByHeadBranch = (...args: Parameters<PullRequestLifecycleRepository["getOpenPullRequestNumbersByHeadBranch"]>) => this.lifecycleRepository.getOpenPullRequestNumbersByHeadBranch(...args);
    getHeadBranchForIssue = (...args: Parameters<PullRequestLifecycleRepository["getHeadBranchForIssue"]>) => this.lifecycleRepository.getHeadBranchForIssue(...args);
    isLinked = (...args: Parameters<PullRequestLifecycleRepository["isLinked"]>) => this.lifecycleRepository.isLinked(...args);
    updateBaseBranch = (...args: Parameters<PullRequestLifecycleRepository["updateBaseBranch"]>) => this.lifecycleRepository.updateBaseBranch(...args);
    updateDescription = (...args: Parameters<PullRequestLifecycleRepository["updateDescription"]>) => this.lifecycleRepository.updateDescription(...args);

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