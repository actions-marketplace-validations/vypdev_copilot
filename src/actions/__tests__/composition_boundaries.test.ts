import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(relativePath: string): string {
    return readFileSync(join(__dirname, '..', relativePath), 'utf8');
}

describe('action composition boundaries', () => {
    it('keeps CLI as an input source delegating to the local lifecycle', () => {
        const cli = readFileSync(join(__dirname, '../../cli.ts'), 'utf8');

        expect(cli).toMatch(/from ['"]\.\/actions\/local_action['"]/);
        expect(cli).toMatch(/await runLocalAction\(/);
        expect(cli).not.toMatch(/from ['"][^'"]*common_action['"]/);
        expect(cli).not.toMatch(/mainRun\(/);
        expect(cli).not.toMatch(/from ['"]@actions\/github['"]/);
    });

    it('keeps GitHub and local lifecycles separate', () => {
        const githubAction = source('github_action.ts');
        const localAction = source('local_action.ts');

        expect(githubAction).toMatch(/from ['"]\.\/common_action['"]/);
        expect(githubAction).toMatch(/from ['"]@actions\/github['"]/);
        expect(githubAction).not.toMatch(/from ['"]\.\/local_action['"]/);
        expect(githubAction).not.toMatch(/runLocalAction\(/);

        expect(localAction).toMatch(/from ['"]\.\/common_action['"]/);
        expect(localAction).not.toMatch(/from ['"]@actions\/github['"]/);
        expect(localAction).not.toMatch(/runGitHubAction\(/);

        const commonAction = source('common_action.ts');
        expect(commonAction).not.toMatch(/data\/repository\/branch_repository/);
        expect(commonAction).toMatch(/LatestTagQueryPort/);
    });

    it('keeps shared input policies independent from lifecycles and infrastructure', () => {
        const inputSource = source('action_input_source.ts');

        expect(inputSource).not.toMatch(/common_action|local_action|github_action/);
        expect(inputSource).not.toMatch(/RepositoryFactory|Repository|@actions\//);
        expect(inputSource).not.toMatch(/application\/|data\/|infrastructure\//);
    });
});
