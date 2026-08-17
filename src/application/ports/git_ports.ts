export interface GitCommitPort {
    execute(program: string, args: string[]): Promise<number>;
    configureAuthor(name: string, email: string): Promise<void>;
    stageAll(): Promise<void>;
    stagePaths(paths: string[]): Promise<void>;
    commit(message: string): Promise<void>;
    push(branch: string): Promise<void>;
}
