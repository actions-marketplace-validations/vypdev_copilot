import * as github from '@actions/github';
import { logDebugInfo } from "../../../utils/logger";

export class IssueLifecycleRepository {
    closeIssue = (owner: string, repository: string, issueNumber: number, token: string): Promise<boolean> =>
        this.transition(owner, repository, issueNumber, token, 'open', 'closed', 'closed', 'already closed');

    openIssue = (owner: string, repository: string, issueNumber: number, token: string): Promise<boolean> =>
        this.transition(owner, repository, issueNumber, token, 'closed', 'open', 're-opened', 'already opened');

    private async transition(
        owner: string,
        repository: string,
        issueNumber: number,
        token: string,
        currentState: 'open' | 'closed',
        targetState: 'open' | 'closed',
        transitionMessage: string,
        noOpMessage: string,
    ): Promise<boolean> {
        const octokit = github.getOctokit(token);
        const { data: issue } = await octokit.rest.issues.get({ owner, repo: repository, issue_number: issueNumber });
        logDebugInfo(`Issue #${issueNumber} state: ${issue.state}`);
        if (issue.state !== currentState) {
            logDebugInfo(`Issue #${issueNumber} is ${noOpMessage}.`);
            return false;
        }
        await octokit.rest.issues.update({ owner, repo: repository, issue_number: issueNumber, state: targetState });
        logDebugInfo(`Issue #${issueNumber} has been ${transitionMessage}.`);
        return true;
    }
}
