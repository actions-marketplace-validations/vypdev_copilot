import type { Execution } from '../../../../../data/model/execution';
import type { BugbotWritePorts } from '../../../../../application/ports/bugbot_write_ports';
import type { BugbotContext } from './types';
import { prepareBugbotFindings, type PreparedBugbotFindings } from './prepare_bugbot_findings';
import { markFindingsResolved } from './mark_findings_resolved_use_case';
import { publishFindings } from './publish_findings_use_case';
import { BUGBOT_MAX_COMMENTS } from '../../../../../utils/constants';

export function prepareDetectedFindings(execution: Execution, response: unknown): PreparedBugbotFindings | undefined {
    return prepareBugbotFindings(
        response,
        execution.ai?.getAiIgnoreFiles?.() ?? [],
        execution.ai?.getBugbotMinSeverity?.(),
        execution.ai?.getBugbotCommentLimit?.() ?? BUGBOT_MAX_COMMENTS,
    );
}

export async function applyDetectedFindings(
    execution: Execution,
    context: BugbotContext,
    prepared: PreparedBugbotFindings,
    ports: BugbotWritePorts,
): Promise<void> {
    await markFindingsResolved({
        execution,
        context,
        resolvedFindingIds: prepared.resolvedFindingIds,
        normalizedResolvedIds: prepared.normalizedResolvedIds,
        ports,
    });
    await publishFindings({
        execution,
        context,
        findings: prepared.toPublish,
        commitSha: context.prContext?.prHeadSha ?? '',
        overflowCount: prepared.overflowCount > 0 ? prepared.overflowCount : undefined,
        overflowTitles: prepared.overflowCount > 0 ? prepared.overflowTitles : undefined,
        ports,
    });
}
