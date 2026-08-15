import { IssueRepository, PROGRESS_LABEL_PATTERN } from '../../data/repository/issue_repository';
import { PullRequestRepository } from '../../data/repository/pull_request_repository';
import { logInfo } from '../../utils/logger';

export async function syncProgressLabelsToOpenPullRequests(
  owner: string,
  repo: string,
  branch: string,
  progress: number,
  token: string,
  issueRepository: IssueRepository,
  pullRequestRepository: PullRequestRepository,
): Promise<void> {
  const roundedProgress = Math.min(100, Math.max(0, Math.round(progress / 5) * 5));
  const newProgressLabel = `${roundedProgress}%`;
  const openPrNumbers = await pullRequestRepository.getOpenPullRequestNumbersByHeadBranch(
    owner,
    repo,
    branch,
    token,
  );

  for (const prNumber of openPrNumbers) {
    const prLabels = await issueRepository.getLabels(owner, repo, prNumber, token);
    const withoutProgress = prLabels.filter((name) => !PROGRESS_LABEL_PATTERN.test(name));
    const nextLabels = withoutProgress.includes(newProgressLabel)
      ? withoutProgress
      : [...withoutProgress, newProgressLabel];
    await issueRepository.setLabels(owner, repo, prNumber, nextLabels, token);
    logInfo(`Progress label set to ${newProgressLabel} on PR #${prNumber}.`);
  }
}
