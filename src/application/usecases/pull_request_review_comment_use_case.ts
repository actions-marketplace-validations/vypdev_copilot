import { Execution } from "../../data/model/execution";
import { Result } from "../../data/model/result";
import { ParamUseCase } from "./base/param_usecase";
import { runCommentAutomation } from "./comment_automation_use_case";
import type { BugbotAutofixParam } from "./steps/commit/bugbot/bugbot_autofix_use_case";
import type { DoUserRequestParam } from "./steps/commit/user_request_use_case";
import type { IssueCommentUpdatePort } from "../ports/issue_ports";
import type { AuthenticatedUserPort, ActorAuthorizationPort } from "../ports/organization_ports";
import type { BugbotWritePorts } from "../ports/bugbot_ports";

export class PullRequestReviewCommentUseCase implements ParamUseCase<Execution, Result[]> {
    taskId = "PullRequestReviewCommentUseCase";

    constructor(
        private readonly languageUseCase: ParamUseCase<Execution, Result[]>,
        private readonly intentUseCase: ParamUseCase<Execution, Result[]>,
        private readonly thinkUseCase: ParamUseCase<Execution, Result[]>,
        private readonly autofixUseCase: ParamUseCase<BugbotAutofixParam, Result[]>,
        private readonly doUserRequestUseCase: ParamUseCase<DoUserRequestParam, Result[]>,
        private readonly issueCommentUpdatePort: IssueCommentUpdatePort,
        private readonly actorAuthorizationPort: ActorAuthorizationPort,
        private readonly authenticatedUserPort: AuthenticatedUserPort,
        private readonly bugbotWritePorts: BugbotWritePorts,
    ) {}

    async invoke(param: Execution): Promise<Result[]> {
        return runCommentAutomation(param, {
            taskId: this.taskId,
            languageUseCase: this.languageUseCase,
            intentUseCase: this.intentUseCase,
            thinkUseCase: this.thinkUseCase,
            autofixUseCase: this.autofixUseCase,
            doUserRequestUseCase: this.doUserRequestUseCase,
            userComment: param.pullRequest.commentBody ?? "",
        }, this.actorAuthorizationPort, this.authenticatedUserPort, this.bugbotWritePorts);
    }
}
