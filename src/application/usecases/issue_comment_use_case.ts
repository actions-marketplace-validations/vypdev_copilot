import { Execution } from "../../data/model/execution";
import { Result } from "../../data/model/result";
import { ParamUseCase } from "./base/param_usecase";
import { CheckIssueCommentLanguageUseCase } from "./steps/issue_comment/check_issue_comment_language_use_case";
import { runCommentAutomation } from "./comment_automation_use_case";
import type { IssueCommentUpdatePort } from "../ports/issue_ports";

export class IssueCommentUseCase implements ParamUseCase<Execution, Result[]> {
    taskId = "IssueCommentUseCase";

    constructor(private readonly issueCommentUpdatePort: IssueCommentUpdatePort) {}

    async invoke(param: Execution): Promise<Result[]> {
        return runCommentAutomation(param, {
            taskId: this.taskId,
            languageUseCase: new CheckIssueCommentLanguageUseCase(this.issueCommentUpdatePort),
            userComment: param.issue.commentBody ?? "",
        });
    }
}
