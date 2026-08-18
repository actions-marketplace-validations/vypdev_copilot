import type { BugbotIssueComment, BugbotIssueCommentWritePort, BugbotIssueContextPort } from '../../../application/ports/bugbot_ports';
import type { IssueContentRepository } from './issue_content_repository';

export class BugbotIssueRepository implements BugbotIssueContextPort, BugbotIssueCommentWritePort {
    constructor(private readonly content: IssueContentRepository) {}

    listIssueComments = (...args: Parameters<BugbotIssueContextPort['listIssueComments']>): Promise<BugbotIssueComment[]> => this.content.listIssueComments(...args);
    addComment = (...args: Parameters<BugbotIssueCommentWritePort['addComment']>) => this.content.addComment(...args);
    updateComment = (...args: Parameters<BugbotIssueCommentWritePort['updateComment']>) => this.content.updateComment(...args);
}
