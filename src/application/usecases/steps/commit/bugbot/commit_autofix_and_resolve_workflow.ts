import { logInfo } from '../../../../../utils/logger';
import { runBugbotAutofixCommitAndPush } from './bugbot_autofix_commit';
import { markFindingsResolved } from './mark_findings_resolved_use_case';
import { sanitizeFindingIdForMarker } from './marker';
import { getBugbotFixIntentPayload } from './bugbot_fix_intent_payload';
import type { Result } from '../../../../../data/model/result';
import type { Execution } from '../../../../../data/model/execution';
import type { AuthenticatedUserPort } from '../../../../../application/ports/authenticated_user_ports';
import type { BugbotWritePorts } from '../../../../../application/ports/bugbot_ports';
import type { GitCommitPort } from '../../../../../application/ports/git_ports';

export async function commitAutofixAndResolveFindings(
    param: Execution,
    payload: NonNullable<ReturnType<typeof getBugbotFixIntentPayload>>,
    autofixResults: Result[],
    authenticatedUserPort: AuthenticatedUserPort,
    bugbotWritePorts: BugbotWritePorts,
    gitCommitPort: GitCommitPort,
): Promise<void> {
    const lastAutofix = autofixResults.at(-1);
    if (!lastAutofix?.success) {
        logInfo('Bugbot autofix did not succeed; skipping commit.');
        return;
    }
    logInfo('Bugbot autofix succeeded; running commit and push.');
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
        logInfo('No commit performed (no changes or error).');
    }
}
