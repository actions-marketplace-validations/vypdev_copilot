import type {
    AgentExecutionRequest,
    AgentExecutionResult,
    FindingsResult,
    FixerResult,
} from '../model/agent_execution';

export interface FindingsAgentPort {
    execute(request: AgentExecutionRequest): Promise<AgentExecutionResult<FindingsResult>>;
}

export interface FixerAgentPort {
    execute(request: AgentExecutionRequest): Promise<AgentExecutionResult<FixerResult>>;
}
