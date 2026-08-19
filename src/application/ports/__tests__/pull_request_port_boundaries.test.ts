import { existsSync } from 'node:fs';
import { join } from 'node:path';

describe('pull request port boundaries', () => {
    const portsDirectory = join(__dirname, '..');

    it('does not retain a universal pull request ports module', () => {
        expect(existsSync(join(portsDirectory, 'pull_request_ports.ts'))).toBe(false);
    });

    it('keeps pull request contracts separated by capability', () => {
        for (const file of [
            'pull_request_branch_ports.ts',
            'pull_request_description_ports.ts',
            'pull_request_issue_link_ports.ts',
            'pull_request_review_ports.ts',
        ]) {
            expect(existsSync(join(portsDirectory, file))).toBe(true);
        }
    });
});
