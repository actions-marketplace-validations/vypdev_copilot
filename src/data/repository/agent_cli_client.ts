import { spawn } from 'node:child_process';
import { parseAgentCommand } from './agent_command_parser';

export interface AgentCliRequest {
    command: string;
    prompt: string;
    timeoutMs: number;
    signal?: AbortSignal;
    cwd?: string;
}

export class AgentCliError extends Error {
    constructor(
        message: string,
        readonly category: 'configuration' | 'timeout' | 'cancelled' | 'process' | 'output',
        readonly retryable = false,
    ) {
        super(message);
        this.name = 'AgentCliError';
    }
}

function splitCommand(command: string): string[] {
    const parsed = parseAgentCommand(command);
    return [parsed.executable, ...parsed.args];
}

export class AgentCliClient {
    async execute(request: AgentCliRequest): Promise<string> {
        let executable: string;
        let args: string[];
        try {
            [executable, ...args] = splitCommand(request.command);
        } catch (error: unknown) {
            throw new AgentCliError(error instanceof Error ? error.message : String(error), 'configuration');
        }
        return new Promise((resolve, reject) => {
            const child = spawn(executable, args, { cwd: request.cwd, stdio: ['pipe', 'pipe', 'pipe'], shell: false });
            let stdout = '';
            let stderr = '';
            let settled = false;
            const timer = setTimeout(() => {
                child.kill('SIGTERM');
                finishReject(new AgentCliError(`Agent CLI timed out after ${request.timeoutMs}ms.`, 'timeout'));
            }, request.timeoutMs);
            const finishResolve = (value: string) => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                request.signal?.removeEventListener('abort', abort);
                resolve(value);
            };
            const finishReject = (error: Error) => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                request.signal?.removeEventListener('abort', abort);
                reject(error);
            };
            const abort = () => {
                child.kill('SIGTERM');
                finishReject(new AgentCliError('Agent CLI execution was cancelled.', 'cancelled'));
            };
            if (request.signal?.aborted) return abort();
            request.signal?.addEventListener('abort', abort, { once: true });
            child.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });
            child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });
            child.once('error', (error) => finishReject(new AgentCliError(`Unable to start agent CLI: ${error.message}`, 'process')));
            child.once('close', (code) => {
                if (code !== 0) {
                    const detail = stderr.trim() ? `: ${stderr.trim().slice(0, 1000)}` : '';
                    return finishReject(new AgentCliError(`Agent CLI exited with code ${code}${detail}`, 'process', code === 75));
                }
                const output = stdout.trim();
                if (!output) return finishReject(new AgentCliError('Agent CLI returned empty output.', 'output'));
                finishResolve(output);
            });
            child.stdin.end(request.prompt);
        });
    }
}
