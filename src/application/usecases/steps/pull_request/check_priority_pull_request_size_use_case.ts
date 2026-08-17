import { Execution } from "../../../../data/model/execution";
import { Result } from "../../../../data/model/result";
import { logInfo } from "../../../../utils/logger";
import { getTaskEmoji } from "../../../../utils/task_emoji";
import { ParamUseCase } from "../../base/param_usecase";
import { runPrioritySizeCheck } from "../issue/priority_size_check_use_case";

export class CheckPriorityPullRequestSizeUseCase implements ParamUseCase<Execution, Result[]> {
    taskId: string = 'CheckPriorityPullRequestSizeUseCase'; 
    
    async invoke(param: Execution): Promise<Result[]> {
        logInfo(`${getTaskEmoji(this.taskId)} Executing ${this.taskId}.`);
        return runPrioritySizeCheck(param, this.taskId, param.pullRequest.number);
    }
}
