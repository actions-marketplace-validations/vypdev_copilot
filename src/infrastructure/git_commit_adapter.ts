import * as exec from '@actions/exec';
import type { GitCommitPort } from '../application/ports/git_ports';

export class GitCommitAdapter implements GitCommitPort {
    constructor(private readonly executeCommand: (program: string, args: string[]) => Promise<number> = (program, args) => exec.exec(program, args)) {}

    async execute(program: string, args: string[]): Promise<number> {
        return this.executeCommand(program, args);
    }

    async configureAuthor(name: string, email: string): Promise<void> {
        await this.execute('git', ['config', 'user.name', name]);
        await this.execute('git', ['config', 'user.email', email]);
    }

    async stageAll(): Promise<void> {
        await this.execute('git', ['add', '-A']);
    }

    async stagePaths(paths: string[]): Promise<void> {
        await this.execute('git', ['add', '--', ...paths]);
    }

    async commit(message: string): Promise<void> {
        await this.execute('git', ['commit', '-m', message]);
    }

    async push(branch: string): Promise<void> {
        await this.execute('git', ['push', 'origin', branch]);
    }
}
