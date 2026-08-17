export type GitCommandExecutor = (program: string, args: string[]) => Promise<number>;

export interface GitCommitRepositoryOptions {
    execute: GitCommandExecutor;
}

export class GitCommitRepository {
    private readonly execute: GitCommandExecutor;

    constructor(options: GitCommitRepositoryOptions) {
        this.execute = options.execute;
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
