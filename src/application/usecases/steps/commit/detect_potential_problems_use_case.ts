import { isAgentConfigurationReady } from '../../../../data/model/agent';
import { Execution } from '../../../../data/model/execution';
import { Result } from '../../../../data/model/result';
import type { FindingsQueryPort } from '../../../../data/repository/agent_ports';
import { DefaultAgentRepositoryFactory } from '../../../../data/repository/agent_repository_factory';
import { getTaskEmoji } from '../../../../utils/task_emoji';
import { logDebugInfo, logError, logInfo } from '../../../../utils/logger';
import { ParamUseCase } from '../../base/param_usecase';
import { buildBugbotPrompt } from './bugbot/build_bugbot_prompt';
import { loadBugbotContext } from './bugbot/load_bugbot_context_use_case';
import { applyDetectedFindings, prepareDetectedFindings } from './bugbot/apply_detected_findings';
import { queryBugbotFindings } from './bugbot/query_bugbot_findings';

export type { BugbotFinding } from './bugbot/types';

export class DetectPotentialProblemsUseCase implements ParamUseCase<Execution, Result[]> {
    taskId = 'DetectPotentialProblemsUseCase';

    constructor(private readonly aiRepository: FindingsQueryPort = new DefaultAgentRepositoryFactory().createFindings()) {}

    async invoke(param: Execution): Promise<Result[]> {
        logInfo(`${getTaskEmoji(this.taskId)} Executing ${this.taskId}.`);
        const results: Result[] = [];
        try {
            if (!isAgentConfigurationReady(param.ai?.getAgentConfiguration('findings'))) {
                logDebugInfo('OpenCode not configured; skipping potential problems detection.');
                return results;
            }
            if (param.issueNumber === -1) {
                logDebugInfo('No issue number for this branch; skipping potential problems detection.');
                return results;
            }

            const context = await loadBugbotContext(param);
            const prompt = buildBugbotPrompt(param, context);
            logInfo('Detecting potential problems via OpenCode (agent computes changes and checks resolved)...');
            const prepared = prepareDetectedFindings(
                param,
                await queryBugbotFindings(this.aiRepository, param, prompt),
            );
            if (prepared === undefined) {
                logDebugInfo('DetectPotentialProblems: No response from OpenCode.');
                return results;
            }

            if (prepared.toPublish.length === 0 && prepared.resolvedFindingIds.size === 0) {
                results.push(new Result({
                    id: this.taskId,
                    success: true,
                    executed: true,
                    steps: ['Potential problems detection completed (no new findings, no resolved).'],
                }));
                return results;
            }

            await applyDetectedFindings(param, context, prepared);
            const stepParts = [`${prepared.toPublish.length} new/current finding(s) from OpenCode`];
            if (prepared.overflowCount > 0) {
                stepParts.push(`${prepared.overflowCount} more not published (see summary comment)`);
            }
            if (prepared.resolvedFindingIds.size > 0) {
                stepParts.push(`${prepared.resolvedFindingIds.size} marked as resolved by OpenCode`);
            }
            results.push(new Result({
                id: this.taskId,
                success: true,
                executed: true,
                steps: [`Potential problems detection completed. ${stepParts.join('; ')}.`],
            }));
        } catch (error) {
            logError(`Error in ${this.taskId}: ${error}`);
            results.push(new Result({
                id: this.taskId,
                success: false,
                executed: true,
                errors: [`Error in ${this.taskId}: ${error}`],
            }));
        }
        return results;
    }
}
