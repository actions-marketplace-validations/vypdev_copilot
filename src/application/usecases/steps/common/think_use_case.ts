import { isAgentConfigurationReady } from '../../../../data/model/agent';
import { Execution } from '../../../../data/model/execution';
import { Result } from '../../../../data/model/result';
import { OPENCODE_AGENT_PLAN } from '../../../../data/repository/agent_task_policy';
import type { FindingsQueryPort } from '../../../ports/agent_ports';
import { THINK_RESPONSE_SCHEMA } from '../../../../data/repository/agent_response_schemas';
import type { IssueDescriptionQueryPort, IssueNotificationPort } from '../../../ports/issue_ports';
import { getThinkPrompt } from '../../../../prompts';
import { logDebugInfo, logError, logInfo } from '../../../../utils/logger';
import { OPENCODE_PROJECT_CONTEXT_INSTRUCTION } from '../../../../utils/opencode_project_context_instruction';
import { ParamUseCase } from '../../base/param_usecase';
import { extractStructuredAnswer } from './agent_answer_policy';
import { extractMentionQuestion, getThinkCommentBody } from './think_input_policy';

export class ThinkUseCase implements ParamUseCase<Execution, Result[]> {
    taskId: string = 'ThinkUseCase';
    private aiRepository: FindingsQueryPort;
    constructor(
        private readonly issueDescriptionQueryPort: IssueDescriptionQueryPort,
        private readonly issueNotificationPort: IssueNotificationPort,
        aiRepository: FindingsQueryPort,
    ) {
        this.aiRepository = aiRepository;
    }

    async invoke(param: Execution): Promise<Result[]> {
        const results: Result[] = [];

        logInfo('Think: processing comment (AI Q&A).');

        try {
            const commentBody = getThinkCommentBody({
                issueCommentBody: param.issue.commentBody,
                pullRequestReviewCommentBody: param.pullRequest.commentBody,
                isIssueComment: param.issue.isIssueComment,
                isPullRequestReviewComment: param.pullRequest.isPullRequestReviewComment,
            });

            if (!commentBody.trim()) {
                results.push(
                    new Result({
                        id: this.taskId,
                        success: true,
                        executed: false,
                    })
                );
                return results;
            }

            if (!param.tokenUser?.trim()) {
                logInfo('Bot username (tokenUser) not set; skipping Think response.');
                results.push(
                    new Result({
                        id: this.taskId,
                        success: true,
                        executed: false,
                    })
                );
                return results;
            }

            if (!commentBody.includes(`@${param.tokenUser}`)) {
                logInfo(`Comment does not mention @${param.tokenUser}; skipping.`);
                results.push(
                    new Result({
                        id: this.taskId,
                        success: true,
                        executed: false,
                    })
                );
                return results;
            }

            if (!isAgentConfigurationReady(param.ai?.getAgentConfiguration('findings'))) {
                results.push(
                    new Result({
                        id: this.taskId,
                        success: false,
                        executed: false,
                        errors: ['OpenCode server URL or model not found.'],
                    })
                );
                return results;
            }

            const question = extractMentionQuestion(commentBody, param.tokenUser);
            if (!question) {
                results.push(
                    new Result({
                        id: this.taskId,
                        success: true,
                        executed: false,
                    })
                );
                return results;
            }

            const issueNumberForContext =
                param.issue.isIssueComment ? param.issue.number : param.issueNumber;
            let issueDescription = '';
            if (issueNumberForContext > 0) {
                const desc = await this.issueDescriptionQueryPort.getDescription(
                    param.owner,
                    param.repo,
                    issueNumberForContext,
                    param.tokens.token,
                );
                if (desc?.trim()) {
                    issueDescription = desc.trim();
                }
            }

            const contextBlock = issueDescription
                ? `\n\nContext (issue #${issueNumberForContext} description):\n${issueDescription}\n\n`
                : '\n\n';
            logDebugInfo(`Think: question length=${question.length}, issue context length=${issueDescription.length}. Full question:\n${question}`);
            const prompt = getThinkPrompt({
                projectContextInstruction: OPENCODE_PROJECT_CONTEXT_INSTRUCTION,
                contextBlock,
                question,
            });
            logDebugInfo(`Think: calling OpenCode Plan agent (prompt length=${prompt.length}).`);
            const response = await this.aiRepository.askAgent(param.ai, OPENCODE_AGENT_PLAN, prompt, {
                expectJson: true,
                schema: THINK_RESPONSE_SCHEMA as unknown as Record<string, unknown>,
                schemaName: 'think_response',
            });
            const answer = extractStructuredAnswer(response);

            logDebugInfo(`Think: OpenCode response received. Answer length=${answer.length}. Full answer:\n${answer}`);

            if (!answer) {
                logError('OpenCode returned no answer for Think.');
                results.push(
                    new Result({
                        id: this.taskId,
                        success: false,
                        executed: true,
                        errors: ['OpenCode returned no answer.'],
                    })
                );
                return results;
            }

            const issueOrPrNumber = param.issue.isIssueComment
                ? param.issue.number
                : param.pullRequest.number;
            if (issueOrPrNumber <= 0) {
                logError('Issue or PR number not available for adding comment.');
                results.push(
                    new Result({
                        id: this.taskId,
                        success: false,
                        executed: true,
                        errors: ['Issue or PR number not available.'],
                    })
                );
                return results;
            }

            await this.issueNotificationPort.addComment(
                param.owner,
                param.repo,
                issueOrPrNumber,
                answer.trim(),
                param.tokens.token,
            );
            logInfo(`Think response posted to ${param.issue.isIssueComment ? 'issue' : 'PR'} #${issueOrPrNumber}.`);

            results.push(
                new Result({
                    id: this.taskId,
                    success: true,
                    executed: true,
                })
            );
        } catch (error) {
            logError(`Error in ThinkUseCase: ${error}`);
            results.push(
                new Result({
                    id: this.taskId,
                    success: false,
                    executed: false,
                    errors: [`Error in ThinkUseCase: ${error}`],
                })
            );
        }
        return results;
    }
}
