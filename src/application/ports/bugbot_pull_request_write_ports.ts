import type { BugbotPullRequestReviewComment } from './bugbot_pull_request_read_ports';

export interface BugbotPullRequestWritePort {
    createReviewWithComments(owner: string, repository: string, pullNumber: number, commitSha: string, comments: Array<{ path: string; line: number; body: string }>, token: string): Promise<void>;
    updatePullRequestReviewComment(owner: string, repository: string, commentId: number, body: string, token: string): Promise<void>;
    listPullRequestReviewComments(owner: string, repository: string, pullNumber: number, token: string): Promise<BugbotPullRequestReviewComment[]>;
    resolvePullRequestReviewThread(owner: string, repository: string, pullNumber: number, nodeId: string, token: string): Promise<void>;
}
