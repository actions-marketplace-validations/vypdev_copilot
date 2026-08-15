/**
 * Loads all bugbot context from GitHub repositories and delegates comment parsing to a pure collaborator.
 */

import type { Execution } from "../../../../data/model/execution";
import { IssueRepository } from "../../../../data/repository/issue_repository";
import { PullRequestRepository } from "../../../../data/repository/pull_request_repository";
import type { BugbotContext } from "./types";
import {
    buildPreviousFindingsBlock,
    collectPreviousBugbotFindings,
    parseBugbotFindingComments,
    type BugbotComment,
} from "./bugbot_finding_context";
import { logDebugInfo } from "../../../../utils/logger";

export interface LoadBugbotContextOptions {
    /** When set (e.g. for issue_comment when commit.branch is empty), use this branch to find open PRs. */
    branchOverride?: string;
}

function emptyBugbotContext(): BugbotContext {
    return {
        existingByFindingId: {},
        issueComments: [],
        openPrNumbers: [],
        previousFindingsBlock: "",
        prContext: null,
        unresolvedFindingsWithBody: [],
    };
}

async function loadOpenPullRequestComments(
    repository: PullRequestRepository,
    owner: string,
    repo: string,
    openPrNumbers: number[],
    token: string
): Promise<ReadonlyMap<number, BugbotComment[]>> {
    const commentsByPullRequest = new Map<number, BugbotComment[]>();
    for (const prNumber of openPrNumbers) {
        commentsByPullRequest.set(
            prNumber,
            await repository.listPullRequestReviewComments(owner, repo, prNumber, token)
        );
    }
    return commentsByPullRequest;
}

async function loadPullRequestContext(
    repository: PullRequestRepository,
    owner: string,
    repo: string,
    openPrNumber: number | undefined,
    token: string
): Promise<BugbotContext["prContext"]> {
    if (openPrNumber == null) return null;
    const prHeadSha = await repository.getPullRequestHeadSha(owner, repo, openPrNumber, token);
    if (!prHeadSha) return null;

    const [prFiles, filesWithLines] = await Promise.all([
        repository.getChangedFiles(owner, repo, openPrNumber, token),
        repository.getFilesWithFirstDiffLine(owner, repo, openPrNumber, token),
    ]);
    const pathToFirstDiffLine = Object.fromEntries(
        filesWithLines.map(({ path, firstLine }) => [path, firstLine])
    );
    return { prHeadSha, prFiles, pathToFirstDiffLine };
}

export async function loadBugbotContext(
    param: Execution,
    options?: LoadBugbotContextOptions
): Promise<BugbotContext> {
    const issueNumber = param.issueNumber;
    const headBranch = (options?.branchOverride ?? param.commit.branch)?.trim();
    const token = param.tokens.token;
    const owner = param.owner;
    const repo = param.repo;

    if (!headBranch) {
        logDebugInfo("LoadBugbotContext: no head branch (branchOverride or commit.branch); returning empty context.");
        return emptyBugbotContext();
    }

    const issueRepository = new IssueRepository();
    const pullRequestRepository = new PullRequestRepository();
    const issueComments = await issueRepository.listIssueComments(owner, repo, issueNumber, token);
    const openPrNumbers = await pullRequestRepository.getOpenPullRequestNumbersByHeadBranch(
        owner,
        repo,
        headBranch,
        token
    );
    const pullRequestComments = await loadOpenPullRequestComments(
        pullRequestRepository,
        owner,
        repo,
        openPrNumbers,
        token
    );
    const parsedComments = parseBugbotFindingComments(issueComments, pullRequestComments);
    const previousFindings = collectPreviousBugbotFindings(
        parsedComments.issueComments,
        parsedComments.existingByFindingId,
        parsedComments.prFindingIdToBody
    );
    const previousFindingsBlock = buildPreviousFindingsBlock(previousFindings);
    const prContext = await loadPullRequestContext(
        pullRequestRepository,
        owner,
        repo,
        openPrNumbers[0],
        token
    );
    const unresolvedFindingsWithBody = previousFindings.map((finding) => ({
        id: finding.id,
        fullBody: finding.fullBody,
    }));

    logDebugInfo(
        `LoadBugbotContext: issue #${issueNumber}, branch ${headBranch}, open PRs=${openPrNumbers.length}, existing findings=${Object.keys(parsedComments.existingByFindingId).length}, unresolved with body=${unresolvedFindingsWithBody.length}.`
    );
    return {
        existingByFindingId: parsedComments.existingByFindingId,
        issueComments: parsedComments.issueComments,
        openPrNumbers,
        previousFindingsBlock,
        prContext,
        unresolvedFindingsWithBody,
    };
}
