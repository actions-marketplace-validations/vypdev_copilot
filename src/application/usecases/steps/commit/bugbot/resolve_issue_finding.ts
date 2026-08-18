import type { BugbotIssueCommentWritePort } from "../../../../../application/ports/bugbot_ports";
import { logDebugInfo, logError } from "../../../../../utils/logger";
import { replaceMarkerInBody } from "./marker";

export interface IssueFindingResolution {
    findingId: string;
    commentId: number;
    owner: string;
    repo: string;
    issueNumber: number;
    token: string;
    body: string | null | undefined;
}

const RESOLVED_NOTE = '\n\n---\n**Resolved** (OpenCode confirmed fixed in latest analysis).\n';

export async function resolveIssueFinding(
    repository: BugbotIssueCommentWritePort,
    resolution: IssueFindingResolution,
    marker: string
): Promise<void> {
    const { findingId, commentId, owner, repo, issueNumber, token, body } = resolution;
    const { updated, replaced } = replaceMarkerInBody(
        body ?? "",
        findingId,
        true,
        RESOLVED_NOTE + marker
    );
    if (!replaced) return;

    try {
        await repository.updateComment(owner, repo, issueNumber, commentId, updated.trimEnd(), token);
        logDebugInfo(
            `Marked finding "${findingId}" as resolved on issue #${issueNumber} (comment ${commentId}).`
        );
    } catch (err) {
        logError(
            `[Bugbot] Error al actualizar comentario de la issue (marcar como resuelto). findingId="${findingId}", issueCommentId=${commentId}, issueNumber=${issueNumber}: ${err}`
        );
    }
}
