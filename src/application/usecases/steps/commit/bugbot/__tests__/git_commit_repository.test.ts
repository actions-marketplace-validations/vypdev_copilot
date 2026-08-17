import { GitCommitRepository } from '../git_commit_repository';

describe('GitCommitRepository', () => {
    it('configures author, stages, commits and pushes through the port', async () => {
        const calls: string[][] = [];
        const repository = new GitCommitRepository({
            execute: async (program, args) => {
                calls.push([program, ...args]);
                return 0;
            },
        });

        await repository.configureAuthor('Efra Espada', 'efra@example.test');
        await repository.stagePaths(['src/file.ts']);
        await repository.stageAll();
        await repository.commit('fix: test');
        await repository.push('master');

        expect(calls).toEqual([
            ['git', 'config', 'user.name', 'Efra Espada'],
            ['git', 'config', 'user.email', 'efra@example.test'],
            ['git', 'add', '--', 'src/file.ts'],
            ['git', 'add', '-A'],
            ['git', 'commit', '-m', 'fix: test'],
            ['git', 'push', 'origin', 'master'],
        ]);
    });
});
