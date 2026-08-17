import type { ExistingByFindingId } from "./types";
import { MAX_FINDING_BODY_LENGTH, truncateFindingBody } from "./build_bugbot_fix_prompt";
import { parseMarker } from "./marker";

export interface BugbotComment {
    id: number;
    body: string | null;
}

export interface ParsedBugbotFindingComments {
    issueComments: BugbotComment[];
    existingByFindingId: ExistingByFindingId;
    prFindingIdToBody: Record<string, string>;
}

export function parseBugbotFindingComments(
    issueComments: BugbotComment[],
    pullRequestCommentsByNumber: ReadonlyMap<number, BugbotComment[]>
): ParsedBugbotFindingComments {
    const boundedIssueComments = issueComments.map((comment) => ({
        ...comment,
        body: comment.body == null ? comment.body : truncateFindingBody(comment.body, MAX_FINDING_BODY_LENGTH),
    }));
    const existingByFindingId: ExistingByFindingId = {};

    for (const comment of issueComments) {
        for (const { findingId, resolved } of parseMarker(comment.body)) {
            existingByFindingId[findingId] = {
                ...(existingByFindingId[findingId] ?? {}),
                issueCommentId: comment.id,
                resolved,
            };
        }
    }

    const prFindingIdToBody: Record<string, string> = {};
    for (const [prNumber, comments] of pullRequestCommentsByNumber) {
        for (const comment of comments) {
            const body = comment.body ?? "";
            for (const { findingId, resolved } of parseMarker(body)) {
                existingByFindingId[findingId] = {
                    ...(existingByFindingId[findingId] ?? {}),
                    prCommentId: comment.id,
                    prNumber,
                    resolved,
                };
                prFindingIdToBody[findingId] = truncateFindingBody(body, MAX_FINDING_BODY_LENGTH);
            }
        }
    }

    return { issueComments: boundedIssueComments, existingByFindingId, prFindingIdToBody };
}

export interface PreviousBugbotFinding {
    id: string;
    fullBody: string;
}

export function collectPreviousBugbotFindings(
    issueComments: BugbotComment[],
    existingByFindingId: ExistingByFindingId,
    prFindingIdToBody: Record<string, string>
): PreviousBugbotFinding[] {
    return Object.entries(existingByFindingId).flatMap(([findingId, data]) => {
        if (data.resolved) return [];
        const issueBody = issueComments.find((comment) => comment.id === data.issueCommentId)?.body ?? null;
        const rawBody = (issueBody ?? prFindingIdToBody[findingId] ?? "").trim();
        return rawBody
            ? [{ id: findingId, fullBody: truncateFindingBody(rawBody, MAX_FINDING_BODY_LENGTH) }]
            : [];
    });
}

export function buildPreviousFindingsBlock(previousFindings: PreviousBugbotFinding[]): string {
    if (previousFindings.length === 0) return "";
    const items = previousFindings
        .map(
            (finding) =>
                `---\n**Finding id (use this exact id in resolved_finding_ids if resolved/no longer applies):** \`${finding.id.replace(/`/g, "\\`")}\`\n\n**Full comment as posted (including metadata at the end):**\n${finding.fullBody}\n`
        )
        .join("\n");
    return `
**Previously reported issues (not yet marked resolved).** For each one we show the exact comment we posted (title, description, location, suggestion, and a hidden marker with the finding id at the end).

${items}
**Your task 2:** For each finding above, analyze the current code and decide:
- If the problem **still exists** (same code or same issue present): do **not** include its id in \`resolved_finding_ids\`.
- If the problem **no longer applies** (e.g. that code was removed or refactored away): include its id in \`resolved_finding_ids\`.
- If the problem **has been fixed** (code was changed and the issue is resolved): include its id in \`resolved_finding_ids\`.

Return in \`resolved_finding_ids\` only the ids from the list above that are now fixed or no longer apply. Use the exact id shown in each "Finding id" line.`;
}
