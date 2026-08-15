import * as exec from "@actions/exec";
import { logDebugInfo, logError, logInfo } from "../../../../utils/logger";

const STASH_MESSAGE = "bugbot-autofix-before-checkout";

async function hasUncommittedChanges(): Promise<boolean> {
    let output = "";
    await exec.exec("git", ["status", "--porcelain"], {
        listeners: {
            stdout: (data: Buffer) => {
                output += data.toString();
            },
        },
    });
    return output.trim().length > 0;
}

/** Infrastructure boundary for checking out a branch without losing workspace changes. */
export async function checkoutBranch(branch: string): Promise<boolean> {
    let didStash = false;
    try {
        if (await hasUncommittedChanges()) {
            logDebugInfo("Uncommitted changes present; stashing before checkout.");
            await exec.exec("git", ["stash", "push", "-u", "-m", STASH_MESSAGE]);
            didStash = true;
        }

        await exec.exec("git", ["fetch", "origin", branch]);
        await exec.exec("git", ["checkout", branch]);
        logInfo(`Checked out branch ${branch}.`);

        if (!didStash) return true;
        try {
            await exec.exec("git", ["stash", "pop"]);
            logDebugInfo("Restored stashed changes after checkout.");
            return true;
        } catch (popErr) {
            const popMsg = popErr instanceof Error ? popErr.message : String(popErr);
            logError(`Failed to restore stashed changes after checkout: ${popMsg}`);
            logError("Changes remain stashed; run 'git stash pop' manually to restore them.");
            return false;
        }
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logError(`Failed to checkout branch ${branch}: ${msg}`);
        if (didStash) {
            logError("Changes were stashed; run 'git stash pop' manually to restore them.");
        }
        return false;
    }
}
