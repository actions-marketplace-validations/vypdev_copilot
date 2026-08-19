import { BUGBOT_MAX_COMMENTS, BUGBOT_MIN_SEVERITY, INPUT_KEYS } from '../utils/constants';
import { isEnabledInput } from './input_boolean_policy';
import { parseBoundedPositiveIntegerInput } from './input_number_policy';
import { parseDelimitedValues } from './input_values_policy';
import { buildAgentTasksFromInputs } from './agent_input_builder';
import type { AgentTaskConfiguration } from '../data/model/agent';

export interface GithubActionAiInputs {
    readonly serverUrl: string;
    readonly requestedAgentTasks: AgentTaskConfiguration;
    readonly startServer: boolean;
    readonly pullRequestDescription: boolean;
    readonly membersOnly: boolean;
    readonly includeReasoning: boolean;
    readonly ignoreFiles: string[];
    readonly bugbotSeverity: string;
    readonly bugbotCommentLimit: number;
    readonly bugbotFixVerifyCommands: string[];
}

export function readGithubActionAgentTasks(
    getInput: (key: string) => string,
    serverUrl: string,
): AgentTaskConfiguration {
    return buildAgentTasksFromInputs((key) =>
        key === INPUT_KEYS.OPENCODE_SERVER_URL ? serverUrl : getInput(key),
    );
}

export function readGithubActionAiInputs(getInput: (key: string) => string): GithubActionAiInputs {
    const serverUrl = getInput(INPUT_KEYS.OPENCODE_SERVER_URL) || 'http://127.0.0.1:4096';
    const requestedAgentTasks = buildAgentTasksFromInputs(getInput);
    const startServer = isEnabledInput(getInput(INPUT_KEYS.OPENCODE_START_SERVER))
        && requestedAgentTasks.findings.provider === 'opencode'
        && requestedAgentTasks.findings.transport === 'server';
    const verifyCommands = getInput(INPUT_KEYS.BUGBOT_FIX_VERIFY_COMMANDS)
        .split(',')
        .map((command) => command.trim())
        .filter((command) => command.length > 0);

    return {
        serverUrl,
        requestedAgentTasks,
        startServer,
        pullRequestDescription: isEnabledInput(getInput(INPUT_KEYS.AI_PULL_REQUEST_DESCRIPTION)),
        membersOnly: isEnabledInput(getInput(INPUT_KEYS.AI_MEMBERS_ONLY)),
        includeReasoning: isEnabledInput(getInput(INPUT_KEYS.AI_INCLUDE_REASONING)),
        ignoreFiles: parseDelimitedValues(getInput(INPUT_KEYS.AI_IGNORE_FILES)),
        bugbotSeverity: getInput(INPUT_KEYS.BUGBOT_SEVERITY) || BUGBOT_MIN_SEVERITY,
        bugbotCommentLimit: parseBoundedPositiveIntegerInput(getInput(INPUT_KEYS.BUGBOT_COMMENT_LIMIT), BUGBOT_MAX_COMMENTS, 200),
        bugbotFixVerifyCommands: verifyCommands,
    };
}
