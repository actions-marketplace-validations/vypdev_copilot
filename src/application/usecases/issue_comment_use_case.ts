import { Execution } from "../../data/model/execution";
import { Result } from "../../data/model/result";
import { ParamUseCase } from "./base/param_usecase";
import { runCommentAutomation } from "./comment_automation_use_case";
import type { IssueCommentUpdatePort, IssueDescriptionQueryPort, IssueNotificationPort } from "../ports/issue_ports";
import type { ActorAuthorizationPort } from "../ports/organization_ports";

export class IssueCommentUseCase implements ParamUseCase<Execution, Result[]> {
    taskId = "IssueCommentUseCase";

    constructor(
        private readonly languageUseCase: ParamUseCase<Execution, Result[]>,
        private readonly issueCommentUpdatePort: IssueCommentUpdatePort,
        private readonly actorAuthorizationPort: ActorAuthorizationPort,
        private readonly issueDescriptionQueryPort: IssueDescriptionQueryPort,
        private readonly issueNotificationPort: IssueNotificationPort,
    ) {}

    async invoke(param: Execution): Promise<Result[]> {
        return runCommentAutomation(param, {
            taskId: this.taskId,
            languageUseCase: this.languageUseCase,
            userComment: param.issue.commentBody ?? "",
        }, this.actorAuthorizationPort, this.issueDescriptionQueryPort, this.issueNotificationPort);
    }
}
