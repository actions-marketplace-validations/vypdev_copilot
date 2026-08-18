import { Execution } from "../../../../data/model/execution";
import { Result } from "../../../../data/model/result";
import type { BranchPreparationPort } from "../../../ports/branch_preparation_ports";
import { logDebugInfo, logError, logInfo } from "../../../../utils/logger";
import { getTaskEmoji } from "../../../../utils/task_emoji";
import { ParamUseCase } from "../../base/param_usecase";
import { CommitPrefixBuilderUseCase } from "../common/execute_script_use_case";
import { MoveIssueToInProgressUseCase } from "./move_issue_to_in_progress";
import { prepareHotfixBranch } from "./prepare_hotfix_branch";
import { prepareReleaseBranch } from "./prepare_release_branch";
import { selectBranchPreparationStrategy } from "./branch_preparation_strategy";
import type { ProjectBoardCommandPort } from "../../../../application/ports/project_board_ports";

export class PrepareBranchesUseCase implements ParamUseCase<Execution, Result[]> {
    taskId = "PrepareBranchesUseCase";
    constructor(private readonly projectBoardPort: ProjectBoardCommandPort, private readonly branchPreparationPort: BranchPreparationPort) {}

    async invoke(param: Execution): Promise<Result[]> {
        logInfo(`${getTaskEmoji(this.taskId)} Executing ${this.taskId}.`);
        const result: Result[] = [];
        try {
            const issueTitle = param.issue.title ?? "";
            if (!param.labels.isMandatoryBranchedLabel && issueTitle.length === 0) {
                return [
                    new Result({
                        id: this.taskId,
                        success: false,
                        executed: false,
                        reminders: ["Tried to check the title but no one was found."],
                    }),
                ];
            }

            await this.branchPreparationPort.fetchRemoteBranches();
            result.push(
                new Result({
                    id: this.taskId,
                    success: true,
                    executed: true,
                    reminders: ["Take a coffee break while you work ☕."],
                })
            );
            const branches = await this.branchPreparationPort.getListOfBranches(
                param.owner,
                param.repo,
                param.tokens.token
            );
            branches.forEach((branch) => logDebugInfo(`- ${branch}`));

            const strategy = selectBranchPreparationStrategy({
                hotfixActive: param.hotfix.active,
                releaseActive: param.release.active,
            });
            if (strategy === "hotfix") {
                return result.concat(
                    await prepareHotfixBranch(param, this.branchPreparationPort, branches, this.taskId)
                );
            }
            if (strategy === "release") {
                return result.concat(
                    await prepareReleaseBranch(param, this.branchPreparationPort, branches, this.taskId)
                );
            }

            result.push(...(await this.prepareManagedBranch(param, issueTitle)));
            return result;
        } catch (error) {
            logError(
                `PrepareBranches: error preparing branches for issue #${param.issueNumber}.`,
                error instanceof Error ? { stack: error.stack } : undefined
            );
            result.push(
                new Result({
                    id: this.taskId,
                    success: false,
                    executed: true,
                    steps: ["Tried to prepare the hotfix branch to the issue, but there was a problem."],
                    error,
                })
            );
            return result;
        }
    }

    private async prepareManagedBranch(param: Execution, issueTitle: string): Promise<Result[]> {
        logDebugInfo(`Branch type: ${param.managementBranch}`);
        const branchesResult = await this.branchPreparationPort.manageBranches(
            param,
            param.owner,
            param.repo,
            param.issueNumber,
            issueTitle,
            param.managementBranch,
            param.branches.development,
            param.hotfix?.branch,
            param.hotfix.active,
            param.tokens.token
        );
        const lastAction = branchesResult.at(-1);
        if (!lastAction?.success || !lastAction.executed) return branchesResult;

        const branchName = lastAction.payload?.newBranchName;
        if (typeof branchName !== "string" || branchName.length === 0) return branchesResult;
        param.currentConfiguration.workingBranch = branchName;

        const commitPrefix = await this.buildCommitPrefix(param, branchName);
        const rename =
            lastAction.payload.baseBranchName.includes(`${param.branches.featureTree}/`) ||
            lastAction.payload.baseBranchName.includes(`${param.branches.bugfixTree}/`);
        const developmentUrl = `https://github.com/${param.owner}/${param.repo}/tree/${param.branches.development}`;
        const step = rename
            ? `The branch **${lastAction.payload.baseBranchName}** was renamed to [**${branchName}**](${lastAction.payload.newBranchUrl}).`
            : `The branch [**${lastAction.payload.baseBranchName}**](${lastAction.payload.baseBranchUrl}) was used to create [**${branchName}**](${lastAction.payload.newBranchUrl}).`;
        const inlineCode = "`";
        const fence = "```";
        const reminder = rename
            ? `Open a Pull Request from [${inlineCode}${branchName}${inlineCode}](${lastAction.payload.newBranchUrl}) to [${inlineCode}${param.branches.development}${inlineCode}](${developmentUrl}). [New PR](https://github.com/${param.owner}/${param.repo}/compare/${param.branches.development}...${branchName}?expand=1)`
            : `Open a Pull Request from [${inlineCode}${branchName}${inlineCode}](${lastAction.payload.newBranchUrl}) to [${inlineCode}${lastAction.payload.baseBranchName}${inlineCode}](${lastAction.payload.baseBranchUrl}). [New PR](https://github.com/${param.owner}/${param.repo}/compare/${lastAction.payload.baseBranchName}...${branchName}?expand=1)`;
        const reminders = [
            `Check out the branch:\n> ${fence}bash\n> git fetch -v && git checkout ${branchName}\n> ${fence}`,
            ...(commitPrefix ? [`Commit the needed changes with this prefix:\n> ${fence}\n>${commitPrefix}\n> ${fence}`] : []),
            reminder,
        ];
        const result: Result[] = [
            new Result({ id: this.taskId, success: true, executed: true, steps: [step], reminders }),
        ];
        if (param.hotfix.active) {
            const mainBranchUrl = `https://github.com/${param.owner}/${param.repo}/tree/${param.branches.main}`;
            result.push(
                new Result({
                    id: this.taskId,
                    success: true,
                    executed: true,
                    reminders: [
                        `After merging into [${inlineCode}${lastAction.payload.baseBranchName}${inlineCode}](${lastAction.payload.baseBranchUrl}), open a Pull Request from [${inlineCode}${lastAction.payload.baseBranchName}${inlineCode}](${lastAction.payload.baseBranchUrl}) to [${inlineCode}${param.branches.main}${inlineCode}](${mainBranchUrl}). [New PR](https://github.com/${param.owner}/${param.repo}/compare/${param.branches.main}...${lastAction.payload.baseBranchName}?expand=1)`,
                        `After merging into [${inlineCode}${param.branches.main}${inlineCode}](${mainBranchUrl}), create the tag ${inlineCode}${param.hotfix.version}${inlineCode}.`,
                    ],
                })
            );
        }
        await new Promise((resolve) => setTimeout(resolve, 10000));
        result.push(...(await new MoveIssueToInProgressUseCase(this.projectBoardPort).invoke(param)));
        return result;
    }

    private async buildCommitPrefix(param: Execution, branchName: string): Promise<string> {
        if (!param.commitPrefixBuilder) return "";
        param.commitPrefixBuilderParams = { branchName };
        const results = await new CommitPrefixBuilderUseCase().invoke(param);
        return results.at(-1)?.payload?.scriptResult?.toString() ?? "";
    }
}
