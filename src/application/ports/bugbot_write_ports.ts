import type { BugbotIssueCommentWritePort } from './bugbot_issue_write_ports';
import type { BugbotPullRequestWritePort } from './bugbot_pull_request_write_ports';

export interface BugbotWritePorts {
    issueComments: BugbotIssueCommentWritePort;
    pullRequestComments: BugbotPullRequestWritePort;
}
