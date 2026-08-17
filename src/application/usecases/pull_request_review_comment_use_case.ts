import { Execution } from "../../data/model/execution";
import { Result } from "../../data/model/result";
import { ParamUseCase } from "./base/param_usecase";
import { CheckPullRequestCommentLanguageUseCase } from "./steps/pull_request_review_comment/check_pull_request_comment_language_use_case";
import { runCommentAutomation } from "./comment_automation_use_case";
import type { IssueCommentUpdatePort } from "../ports/issue_ports";
import type { ActorAuthorizationPort } from "../ports/organization_ports";

export class PullRequestReviewCommentUseCase implements ParamUseCase<Execution, Result[]> {
    taskId = "PullRequestReviewCommentUseCase";

    constructor(
        private readonly issueCommentUpdatePort: IssueCommentUpdatePort,
        private readonly actorAuthorizationPort: ActorAuthorizationPort,
    ) {}

    async invoke(param: Execution): Promise<Result[]> {
        return runCommentAutomation(param, {
            taskId: this.taskId,
            languageUseCase: new CheckPullRequestCommentLanguageUseCase(this.issueCommentUpdatePort),
            userComment: param.pullRequest.commentBody ?? "",
        }, this.actorAuthorizationPort);
    }
}
