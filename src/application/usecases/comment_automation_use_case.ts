import { Execution } from "../../data/model/execution";
import { Result } from "../../data/model/result";
import { logInfo } from "../../utils/logger";
import { ParamUseCase } from "./base/param_usecase";
import type { BugbotAutofixParam } from "./steps/commit/bugbot/bugbot_autofix_use_case";
import {
    getBugbotFixIntentPayload,
    canRunBugbotAutofix,
    canRunDoUserRequest,
} from "./steps/commit/bugbot/bugbot_fix_intent_payload";
import { resolveCommentAutomationRoute } from './comment_automation_route_policy';
import { commitAutofixAndResolveFindings } from './steps/commit/bugbot/commit_autofix_and_resolve_workflow';
import { commitUserRequestIfSuccessful } from './steps/commit/bugbot/commit_user_request_workflow';
import type { DoUserRequestParam } from "./steps/commit/user_request_use_case";
import type { AuthenticatedUserPort } from "../ports//authenticated_user_ports";
import type { ActorAuthorizationPort } from "../ports//actor_authorization_ports";
import type { BugbotWritePorts } from "../ports/bugbot_ports";
import type { GitCommitPort } from "../ports/git_ports";

export interface CommentAutomationOptions {
    taskId: string;
    languageUseCase: ParamUseCase<Execution, Result[]>;
    intentUseCase: ParamUseCase<Execution, Result[]>;
    thinkUseCase: ParamUseCase<Execution, Result[]>;
    autofixUseCase: ParamUseCase<BugbotAutofixParam, Result[]>;
    doUserRequestUseCase: ParamUseCase<DoUserRequestParam, Result[]>;
    userComment: string;
    gitCommitPort: GitCommitPort;
}

export async function runCommentAutomation(
    param: Execution,
    options: CommentAutomationOptions,
    actorAuthorizationPort: ActorAuthorizationPort,
    authenticatedUserPort: AuthenticatedUserPort,
    bugbotWritePorts: BugbotWritePorts,
): Promise<Result[]> {
    logInfo(`${options.taskId} started.`);
    const results: Result[] = [];
    results.push(...(await options.languageUseCase.invoke(param)));

    logInfo("Running bugbot fix intent detection (before Think).");
    const intentResults = await options.intentUseCase.invoke(param);
    results.push(...intentResults);
    const intentPayload = getBugbotFixIntentPayload(intentResults);
    const runAutofix = canRunBugbotAutofix(intentPayload);

    if (intentPayload) {
        logInfo(
            `Bugbot fix intent: isFixRequest=${intentPayload.isFixRequest}, isDoRequest=${intentPayload.isDoRequest}, targetFindingIds=${intentPayload.targetFindingIds?.length ?? 0}.`
        );
    } else {
        logInfo("Bugbot fix intent: no payload from intent detection.");
    }

    const allowedToModifyFiles = await actorAuthorizationPort.isActorAllowedToModifyFiles(
        param.owner,
        param.actor,
        param.tokens.token
    );
    const canModifyFiles = runAutofix || canRunDoUserRequest(intentPayload);
    const route = resolveCommentAutomationRoute(intentPayload, allowedToModifyFiles);
    if (!allowedToModifyFiles && canModifyFiles) {
        logInfo("Skipping file-modifying use cases: user is not an org member or repo owner.");
    }

    if (route === 'autofix' && intentPayload) {
        const payload = intentPayload;
        logInfo("Running bugbot autofix.");
        const autofixResults = await options.autofixUseCase.invoke({
            execution: param,
            targetFindingIds: payload.targetFindingIds,
            userComment: options.userComment,
            context: payload.context,
            branchOverride: payload.branchOverride,
        });
        results.push(...autofixResults);
        await commitAutofixAndResolveFindings(param, payload, autofixResults, authenticatedUserPort, bugbotWritePorts, options.gitCommitPort);
    } else if (route === 'do-user-request') {
        const payload = intentPayload!;
        logInfo("Running do user request.");
        const doResults = await options.doUserRequestUseCase.invoke({
            execution: param,
            userComment: options.userComment,
            branchOverride: payload.branchOverride,
        });
        results.push(...doResults);
        await commitUserRequestIfSuccessful(param, payload.branchOverride, doResults, authenticatedUserPort, options.gitCommitPort);
    } else if (route === 'think') {
        logInfo("Skipping bugbot autofix (no fix request, no targets, or no context).");
    }

    const ranAutofix = route === 'autofix';
    const ranDoRequest = route === 'do-user-request';
    if (!ranAutofix && !ranDoRequest) {
        logInfo("Running ThinkUseCase (no file-modifying action ran).");
        results.push(...(await options.thinkUseCase.invoke(param)));
    }
    return results;
}
