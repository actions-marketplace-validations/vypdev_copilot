import { Ai } from '../../data/model/ai';
import { isAgentConfigurationReady } from '../../data/model/agent';
import { Execution } from '../../data/model/execution';
import { Result } from '../../data/model/result';
import { logDebugInfo, logError, logInfo, logWarn } from '../../utils/logger';
import { getTaskEmoji } from '../../utils/task_emoji';
import { ParamUseCase } from '../base/param_usecase';
import { IssueRepository } from '../../data/repository/issue_repository';
import { BranchRepository } from '../../data/repository/branch_repository';
import { PullRequestRepository } from '../../data/repository/pull_request_repository';
import { AiRepository, OPENCODE_AGENT_PLAN } from '../../data/repository/ai_repository';
import type { FindingsQueryPort } from '../../data/repository/agent_ports';
import { getCheckProgressPrompt } from '../../prompts';
import { OPENCODE_PROJECT_CONTEXT_INSTRUCTION } from '../../utils/opencode_project_context_instruction';
import { findIssueBranch } from './find_issue_branch';
import { syncProgressLabelsToOpenPullRequests } from './sync_progress_labels_to_open_pull_requests';

import { parseProgressResponse, PROGRESS_RESPONSE_SCHEMA, type ProgressAttemptResult } from './progress_response';

export class CheckProgressUseCase implements ParamUseCase<Execution, Result[]> {
    taskId: string = 'CheckProgressUseCase';
    private issueRepository: IssueRepository = new IssueRepository();
    private branchRepository: BranchRepository = new BranchRepository();
    private pullRequestRepository: PullRequestRepository = new PullRequestRepository();
    private aiRepository: FindingsQueryPort = new AiRepository();

    constructor(aiRepository: FindingsQueryPort = new AiRepository()) {
        this.aiRepository = aiRepository;
    }
    async invoke(param: Execution): Promise<Result[]> {
        logInfo(`${getTaskEmoji(this.taskId)} Executing ${this.taskId}.`);

        const results: Result[] = [];

        try {
            // Check if AI configuration is available
            if (!isAgentConfigurationReady(param.ai?.getAgentConfiguration('findings'))) {
                logError(`Missing required agent configuration. Provide a model and a valid server URL or CLI command.`);
                results.push(
                    new Result({
                        id: this.taskId,
                        success: false,
                        executed: true,
                        errors: [
                            `Missing required agent configuration. Provide a model and a valid server URL or CLI command.`,
                        ],
                    })
                );
                return results;
            }

            // Get issue number
            const issueNumber = param.issueNumber;
            if (issueNumber === -1) {
                logError(`Issue number not found. Cannot check progress without an issue number.`);
                results.push(
                    new Result({
                        id: this.taskId,
                        success: false,
                        executed: true,
                        errors: [
                            `Issue number not found. Cannot check progress without an issue number.`,
                        ],
                    })
                );
                return results;
            }

            logInfo(`📋 Checking progress for issue #${issueNumber}`);

            // Get issue description
            const issueDescription = await this.issueRepository.getDescription(
                param.owner,
                param.repo,
                issueNumber,
                param.tokens.token
            );

            if (!issueDescription) {
                logError(`Could not retrieve issue description for issue #${issueNumber}`);
                results.push(
                    new Result({
                        id: this.taskId,
                        success: false,
                        executed: true,
                        errors: [
                            `Could not retrieve issue description for issue #${issueNumber}`,
                        ],
                    })
                );
                return results;
            }

            const branch = await findIssueBranch(param, this.branchRepository);

            if (!branch) {
                logError(`Could not find branch for issue #${issueNumber}. Please ensure a branch exists with pattern: feature/${issueNumber}-*, bugfix/${issueNumber}-*, docs/${issueNumber}-*, or chore/${issueNumber}-*`);
                results.push(
                    new Result({
                        id: this.taskId,
                        success: false,
                        executed: true,
                        errors: [
                            `Could not find branch for issue #${issueNumber}. Please ensure a branch exists with pattern: feature/${issueNumber}-*, bugfix/${issueNumber}-*, docs/${issueNumber}-*, or chore/${issueNumber}-*`,
                        ],
                    })
                );
                return results;
            }

            // Get development (parent) branch – we pass this so the OpenCode agent can compute the diff
            const developmentBranch = param.branches.development || 'develop';

            logInfo(`📦 Progress will be assessed from workspace diff: base branch "${developmentBranch}", current branch "${branch}" (OpenCode agent will run git diff).`);

            const prompt = getCheckProgressPrompt({
                projectContextInstruction: OPENCODE_PROJECT_CONTEXT_INSTRUCTION,
                issueNumber: String(issueNumber),
                issueDescription,
                baseBranch: developmentBranch,
                currentBranch: branch,
            });

            logDebugInfo(`CheckProgress: prompt length=${prompt.length}, issue description length=${issueDescription.length}.`);
            logInfo('🤖 Analyzing progress using OpenCode Plan agent...');
            const attemptResult = await this.fetchProgressAttempt(param.ai, prompt);
            const progress = attemptResult.progress;
            const summary = attemptResult.summary;
            const reasoning = attemptResult.reasoning;
            const remaining = attemptResult.remaining;

            logDebugInfo(`CheckProgress: raw progress=${progress}, summary length=${summary.length}, reasoning length=${reasoning.length}, remaining length=${remaining?.length ?? 0}. Full summary:\n${summary}`);
            if (reasoning) {
                logDebugInfo(`CheckProgress: full reasoning:\n${reasoning}`);
            }
            if (remaining) {
                logDebugInfo(`CheckProgress: full remaining:\n${remaining}`);
            }

            if (progress < 0 || progress > 100) {
                logWarn(`CheckProgress: unexpected progress value ${progress} (expected 0-100). Clamping for display.`);
            }
            if (progress > 0) {
                logInfo(`✅ Progress detection completed: ${progress}%`);
            }

            const progressFailed = progress === 0;
            if (progressFailed) {
                logError('Progress detection returned 0%. This may be due to a model error or no changes detected.');
                results.push(
                    new Result({
                        id: this.taskId,
                        success: false,
                        executed: true,
                        steps: [
                            `Progress for issue #${issueNumber}: 0%`,
                            summary,
                        ],
                        errors: [
                            'Progress detection returned 0%. This may be due to a model error or no changes detected. Consider re-running the check.',
                        ],
                        payload: {
                            progress: 0,
                            summary,
                            reasoning: reasoning || undefined,
                            issueNumber,
                            branch,
                            developmentBranch,
                        },
                    })
                );
                return results;
            }

            await this.issueRepository.setProgressLabel(
                param.owner,
                param.repo,
                issueNumber,
                progress,
                param.tokens.token,
            );

            await syncProgressLabelsToOpenPullRequests(
                param.owner,
                param.repo,
                branch,
                progress,
                param.tokens.token,
                this.issueRepository,
                this.pullRequestRepository,
            );

            let summaryMessage = `**Analysis**: ${summary}`;
            if (progress < 100 && remaining) {
                summaryMessage += `\n\n## 🤷 What's left to reach 100%\n\n${remaining}`;
            }
            if (reasoning) {
                const truncationNote = this.isReasoningLikelyTruncated(reasoning)
                    ? '\n\n_Reasoning may be truncated by the model._'
                    : '';
                summaryMessage += `\n\n## 🧠 Reasoning\n${reasoning}${truncationNote}`;
            }

            const steps: string[] = [
                `Progress updated to: ${progress}%`,
                summaryMessage,
            ];

            results.push(
                new Result({
                    id: this.taskId,
                    success: true,
                    executed: true,
                    steps,
                    payload: {
                        progress,
                        summary,
                        reasoning: reasoning || undefined,
                        remaining: progress < 100 && remaining ? remaining : undefined,
                        issueNumber,
                        branch,
                        developmentBranch
                    }
                })
            );

        } catch (error) {
            logError(`Error in ${this.taskId}: ${JSON.stringify(error, null, 2)}`);
            results.push(
                new Result({
                    id: this.taskId,
                    success: false,
                    executed: true,
                    errors: [
                        `Error in ${this.taskId}: ${JSON.stringify(error, null, 2)}`,
                    ],
                })
            );
        }

        return results;
    }

    /**
     * Calls the OpenCode agent once and returns parsed progress, summary, and reasoning.
     * HTTP-level retries are handled by AiRepository (OPENCODE_MAX_RETRIES).
     */
    private async fetchProgressAttempt(ai: Ai, prompt: string): Promise<ProgressAttemptResult> {
        return parseProgressResponse(await this.aiRepository.askAgent(
            ai,
            OPENCODE_AGENT_PLAN,
            prompt,
            {
                expectJson: true,
                schema: PROGRESS_RESPONSE_SCHEMA as unknown as Record<string, unknown>,
                schemaName: 'progress_response',
                includeReasoning: true,
            }
        ));
    }

    /**
     * Returns true if the reasoning text looks truncated (e.g. ends with ":" or trailing spaces,
     * or no sentence-ending punctuation), so we can append a note in the comment.
     */
    private isReasoningLikelyTruncated(reasoning: string): boolean {
        const t = reasoning.trim();
        if (t.length === 0) return false;
        const lastChar = t.slice(-1);
        const sentenceEnd = /[.!?\n]$/;
        const endsWithColonOrSpace = /[:\s]$/.test(t);
        return endsWithColonOrSpace || !sentenceEnd.test(lastChar);
    }
}

