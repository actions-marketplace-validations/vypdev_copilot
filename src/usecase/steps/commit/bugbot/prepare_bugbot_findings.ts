import { deduplicateFindings } from './deduplicate_findings';
import { fileMatchesIgnorePatterns } from './file_ignore';
import { applyCommentLimit } from './limit_comments';
import { sanitizeFindingIdForMarker } from './marker';
import { isSafeFindingFilePath } from './path_validation';
import { meetsMinSeverity, normalizeMinSeverity } from './severity';
import type { BugbotFinding } from './types';

export type BugbotResponse = {
    findings?: BugbotFinding[];
    resolved_finding_ids?: string[];
};

export type PreparedBugbotFindings = ReturnType<typeof applyCommentLimit> & {
    resolvedFindingIds: Set<string>;
    normalizedResolvedIds: Set<string>;
};

export function prepareBugbotFindings(
    response: unknown,
    ignorePatterns: string[],
    minSeverityValue: string | undefined,
    maxComments: number,
): PreparedBugbotFindings | undefined {
    if (response == null || typeof response !== 'object') return undefined;
    const payload = response as BugbotResponse;
    const findings = Array.isArray(payload.findings) ? payload.findings : [];
    const resolvedFindingIdsRaw = Array.isArray(payload.resolved_finding_ids)
        ? payload.resolved_finding_ids
        : [];
    const resolvedFindingIds = new Set(resolvedFindingIdsRaw);
    const normalizedResolvedIds = new Set(resolvedFindingIdsRaw.map(sanitizeFindingIdForMarker));
    const minSeverity = normalizeMinSeverity(minSeverityValue);
    const filteredFindings = deduplicateFindings(findings
        .filter((finding) => finding.file == null || String(finding.file).trim() === '' || isSafeFindingFilePath(finding.file))
        .filter((finding) => !fileMatchesIgnorePatterns(finding.file, ignorePatterns))
        .filter((finding) => meetsMinSeverity(finding.severity, minSeverity)));
    return {
        ...applyCommentLimit(filteredFindings, maxComments),
        resolvedFindingIds,
        normalizedResolvedIds,
    };
}
