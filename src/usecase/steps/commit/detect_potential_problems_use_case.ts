import * as github from "@actions/github";
import { Execution } from "../../../data/model/execution";
import { Result } from "../../../data/model/result";
import { AiRepository, OPENCODE_AGENT_PLAN } from "../../../data/repository/ai_repository";
import { BUGBOT_MAX_COMMENTS } from "../../../utils/constants";
import { logDebugInfo, logError, logInfo } from "../../../utils/logger";
import { prepareBugbotFindings } from './bugbot/prepare_bugbot_findings';
import { getTaskEmoji } from "../../../utils/task_emoji";
import { ParamUseCase } from "../../base/param_usecase";
import { buildBugbotPrompt } from "./bugbot/build_bugbot_prompt";
import { loadBugbotContext } from "./bugbot/load_bugbot_context_use_case";
import { markFindingsResolved } from "./bugbot/mark_findings_resolved_use_case";
import { publishFindings } from "./bugbot/publish_findings_use_case";
import { BUGBOT_RESPONSE_SCHEMA } from "./bugbot/schema";

export type { BugbotFinding } from "./bugbot/types";

export class DetectPotentialProblemsUseCase implements ParamUseCase<Execution, Result[]> {
    taskId: string = 'DetectPotentialProblemsUseCase';

    private aiRepository = new AiRepository();

    async invoke(param: Execution): Promise<Result[]> {
        logInfo(`${getTaskEmoji(this.taskId)} Executing ${this.taskId}.`);

        const results: Result[] = [];
        try {
            if (!param.ai?.getOpencodeModel() || !param.ai?.getOpencodeServerUrl()) {
                logDebugInfo('OpenCode not configured; skipping potential problems detection.');
                return results;
            }

            if (param.issueNumber === -1) {
                logDebugInfo('No issue number for this branch; skipping potential problems detection.');
                return results;
            }

            logDebugInfo(`DetectPotentialProblems: loading context for issue #${param.issueNumber}.`);
            const context = await loadBugbotContext(param);
            const prompt = buildBugbotPrompt(param, context);
            logDebugInfo(`DetectPotentialProblems: prompt length=${prompt.length}. Calling OpenCode Plan agent.`);
            logInfo('Detecting potential problems via OpenCode (agent computes changes and checks resolved)...');
            const response = await this.aiRepository.askAgent(param.ai, OPENCODE_AGENT_PLAN, prompt, {
                expectJson: true,
                schema: BUGBOT_RESPONSE_SCHEMA as unknown as Record<string, unknown>,
                schemaName: 'bugbot_findings',
            });

            const prepared = prepareBugbotFindings(
                response,
                param.ai?.getAiIgnoreFiles?.() ?? [],
                param.ai?.getBugbotMinSeverity?.(),
                param.ai?.getBugbotCommentLimit?.() ?? BUGBOT_MAX_COMMENTS,
            );
            if (prepared === undefined) {
                logDebugInfo('DetectPotentialProblems: No response from OpenCode.');
                return results;
            }

            const {
                toPublish,
                overflowCount,
                overflowTitles,
                resolvedFindingIds,
                normalizedResolvedIds,
            } = prepared;
            logDebugInfo(`DetectPotentialProblems: OpenCode returned findings=${toPublish.length}, resolved_finding_ids=${resolvedFindingIds.size}.`);

            logDebugInfo(`DetectPotentialProblems: after filters and limit — toPublish=${toPublish.length}, overflow=${overflowCount}.`);

            if (toPublish.length === 0 && resolvedFindingIds.size === 0) {
                logDebugInfo('DetectPotentialProblems: OpenCode returned no new findings (after filters) and no resolved ids.');
                results.push(
                    new Result({
                        id: this.taskId,
                        success: true,
                        executed: true,
                        steps: ['Potential problems detection completed (no new findings, no resolved).'],
                    })
                );
                return results;
            }

            await markFindingsResolved({
                execution: param,
                context,
                resolvedFindingIds,
                normalizedResolvedIds,
            });

            await publishFindings({
                execution: param,
                context,
                findings: toPublish,
                commitSha: github.context.sha,
                overflowCount: overflowCount > 0 ? overflowCount : undefined,
                overflowTitles: overflowCount > 0 ? overflowTitles : undefined,
            });

            const stepParts = [`${toPublish.length} new/current finding(s) from OpenCode`];
            if (overflowCount > 0) {
                stepParts.push(`${overflowCount} more not published (see summary comment)`);
            }
            if (resolvedFindingIds.size > 0) {
                stepParts.push(`${resolvedFindingIds.size} marked as resolved by OpenCode`);
            }
            results.push(
                new Result({
                    id: this.taskId,
                    success: true,
                    executed: true,
                    steps: [`Potential problems detection completed. ${stepParts.join('; ')}.`],
                })
            );
        } catch (error) {
            logError(`Error in ${this.taskId}: ${error}`);
            results.push(
                new Result({
                    id: this.taskId,
                    success: false,
                    executed: true,
                    errors: [`Error in ${this.taskId}: ${error}`],
                })
            );
        }
        return results;
    }
}
