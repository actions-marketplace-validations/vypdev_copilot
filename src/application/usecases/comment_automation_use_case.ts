import { Execution } from "../../data/model/execution";
import { Result } from "../../data/model/result";
import { logInfo } from "../../utils/logger";
import { ParamUseCase } from "./base/param_usecase";
import type { BugbotAutofixParam } from "./steps/commit/bugbot/bugbot_autofix_use_case";
import { runBugbotAutofixCommitAndPush, runUserRequestCommitAndPush } from "./steps/commit/bugbot/bugbot_autofix_commit";
import { markFindingsResolved } from "./steps/commit/bugbot/mark_findings_resolved_use_case";
import { sanitizeFindingIdForMarker } from "./steps/commit/bugbot/marker";
import {
    getBugbotFixIntentPayload,
    canRunBugbotAutofix,
    canRunDoUserRequest,
} from "./steps/commit/bugbot/bugbot_fix_intent_payload";
import type { DoUserRequestParam } from "./steps/commit/user_request_use_case";
import type { AuthenticatedUserPort, ActorAuthorizationPort } from "../ports/organization_ports";
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
    if (!allowedToModifyFiles && canModifyFiles) {
        logInfo("Skipping file-modifying use cases: user is not an org member or repo owner.");
    }

    if (runAutofix && intentPayload && allowedToModifyFiles) {
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
    } else if (!runAutofix && canRunDoUserRequest(intentPayload) && allowedToModifyFiles) {
        const payload = intentPayload!;
        logInfo("Running do user request.");
        const doResults = await options.doUserRequestUseCase.invoke({
            execution: param,
            userComment: options.userComment,
            branchOverride: payload.branchOverride,
        });
        results.push(...doResults);
        await commitUserRequestIfSuccessful(param, payload.branchOverride, doResults, authenticatedUserPort, options.gitCommitPort);
    } else if (!runAutofix) {
        logInfo("Skipping bugbot autofix (no fix request, no targets, or no context).");
    }

    const ranAutofix = runAutofix && allowedToModifyFiles && intentPayload;
    const ranDoRequest = canRunDoUserRequest(intentPayload) && allowedToModifyFiles;
    if (!ranAutofix && !ranDoRequest) {
        logInfo("Running ThinkUseCase (no file-modifying action ran).");
        results.push(...(await options.thinkUseCase.invoke(param)));
    }
    return results;
}

async function commitAutofixAndResolveFindings(
    param: Execution,
    payload: NonNullable<ReturnType<typeof getBugbotFixIntentPayload>>,
    autofixResults: Result[],
    authenticatedUserPort: AuthenticatedUserPort,
    bugbotWritePorts: BugbotWritePorts,
    gitCommitPort: GitCommitPort,
): Promise<void> {
    const lastAutofix = autofixResults.at(-1);
    if (!lastAutofix?.success) {
        logInfo("Bugbot autofix did not succeed; skipping commit.");
        return;
    }

    logInfo("Bugbot autofix succeeded; running commit and push.");
    const autofixPayload = lastAutofix.payload as { workspacePaths?: string[] } | undefined;
    const commitResult = await runBugbotAutofixCommitAndPush(param, {
        branchOverride: payload.branchOverride,
        targetFindingIds: payload.targetFindingIds,
        workspacePaths: autofixPayload?.workspacePaths,
    }, authenticatedUserPort, gitCommitPort);
    if (commitResult.committed && payload.context) {
        const ids = payload.targetFindingIds;
        await markFindingsResolved({
            execution: param,
            context: payload.context,
            resolvedFindingIds: new Set(ids),
            normalizedResolvedIds: new Set(ids.map(sanitizeFindingIdForMarker)),
            ports: bugbotWritePorts,
        });
        logInfo(`Marked ${ids.length} finding(s) as resolved.`);
    } else if (!commitResult.committed) {
        logInfo("No commit performed (no changes or error).");
    }
}

async function commitUserRequestIfSuccessful(
    param: Execution,
    branchOverride: string | undefined,
    results: Result[],
    authenticatedUserPort: AuthenticatedUserPort,
    gitCommitPort: GitCommitPort,
): Promise<void> {
    if (!results.at(-1)?.success) {
        logInfo("Do user request did not succeed; skipping commit.");
        return;
    }
    logInfo("Do user request succeeded; running commit and push.");
    await runUserRequestCommitAndPush(param, { branchOverride }, authenticatedUserPort, gitCommitPort);
}
