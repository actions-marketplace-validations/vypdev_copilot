/**
 * Marks findings reported as fixed by updating their issue comments and PR review threads.
 */

import type { Execution } from "../../../../../data/model/execution";
import type { BugbotWritePorts } from "../../../../../application/ports/bugbot_ports";
import { logError } from "../../../../../utils/logger";
import type { BugbotContext } from "./types";
import { buildMarker, sanitizeFindingIdForMarker } from "./marker";
import { resolveIssueFinding } from "./resolve_issue_finding";
import { resolvePullRequestFinding } from "./resolve_pull_request_finding";

export interface MarkFindingsResolvedParam {
    execution: Execution;
    context: BugbotContext;
    resolvedFindingIds: Set<string>;
    normalizedResolvedIds: Set<string>;
    ports: BugbotWritePorts;
}

export async function markFindingsResolved(param: MarkFindingsResolvedParam): Promise<void> {
    const { execution, context, resolvedFindingIds, normalizedResolvedIds, ports } = param;
    const { existingByFindingId, issueComments } = context;
    const owner = execution.owner;
    const repo = execution.repo;
    const token = execution.tokens.token;


    for (const [findingId, existing] of Object.entries(existingByFindingId)) {
        if (
            existing.resolved ||
            (!resolvedFindingIds.has(findingId) &&
                !normalizedResolvedIds.has(sanitizeFindingIdForMarker(findingId)))
        ) {
            continue;
        }

        const marker = buildMarker(findingId, true);
        if (existing.issueCommentId != null) {
            const comment = issueComments.find((candidate) => candidate.id === existing.issueCommentId);
            if (comment == null) {
                logError(
                    `[Bugbot] No se encontró el comentario de la issue para marcar como resuelto. findingId="${findingId}", issueCommentId=${existing.issueCommentId}, issueNumber=${execution.issueNumber}, owner=${owner}, repo=${repo}.`
                );
            } else {
                await resolveIssueFinding(ports.issueComments, {
                    findingId,
                    commentId: existing.issueCommentId,
                    owner,
                    repo,
                    issueNumber: execution.issueNumber,
                    token,
                    body: comment.body,
                }, marker);
            }
        }

        if (existing.prCommentId != null && existing.prNumber != null) {
            try {
                await resolvePullRequestFinding(ports.pullRequestComments, {
                    findingId,
                    commentId: existing.prCommentId,
                    prNumber: existing.prNumber,
                    owner,
                    repo,
                    token,
                });
            } catch (err) {
                logError(
                    `[Bugbot] Error al cargar el comentario de revisión de la PR (marcar como resuelto). findingId="${findingId}", prCommentId=${existing.prCommentId}, prNumber=${existing.prNumber}: ${err}`
                );
            }
        }
    }
}
