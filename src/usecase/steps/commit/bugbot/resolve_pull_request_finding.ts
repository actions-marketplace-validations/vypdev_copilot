import { PullRequestRepository } from "../../../../data/repository/pull_request_repository";
import { logDebugInfo, logError } from "../../../../utils/logger";
import { replaceMarkerInBody } from "./marker";

export interface PullRequestFindingResolution {
    findingId: string;
    commentId: number;
    prNumber: number;
    owner: string;
    repo: string;
    token: string;
}

export async function resolvePullRequestFinding(
    repository: PullRequestRepository,
    resolution: PullRequestFindingResolution
): Promise<void> {
    const { findingId, commentId, prNumber, owner, repo, token } = resolution;
    const comments = await repository.listPullRequestReviewComments(owner, repo, prNumber, token);
    const comment = comments.find((candidate) => candidate.id === commentId);
    if (comment == null) {
        logError(
            `[Bugbot] No se encontró el comentario de la PR para marcar como resuelto. findingId="${findingId}", prCommentId=${commentId}, prNumber=${prNumber}, owner=${owner}, repo=${repo}.`
        );
        return;
    }

    const { updated, replaced } = replaceMarkerInBody(comment.body ?? "", findingId, true);
    if (!replaced) return;

    try {
        await repository.updatePullRequestReviewComment(
            owner,
            repo,
            commentId,
            updated.trimEnd(),
            token
        );
        logDebugInfo(
            `Marked finding "${findingId}" as resolved on PR #${prNumber} (review comment ${commentId}).`
        );
        if (comment.node_id) {
            await repository.resolvePullRequestReviewThread(
                owner,
                repo,
                prNumber,
                comment.node_id,
                token
            );
        }
    } catch (err) {
        logError(
            `[Bugbot] Error al actualizar comentario de revisión de la PR (marcar como resuelto). findingId="${findingId}", prCommentId=${commentId}, prNumber=${prNumber}: ${err}`
        );
    }
}
