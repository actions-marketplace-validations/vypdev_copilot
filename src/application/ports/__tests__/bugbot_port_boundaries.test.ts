import { existsSync } from 'node:fs';
import { join } from 'node:path';

describe('Bugbot port boundaries', () => {
    const portsDirectory = join(__dirname, '..');

    it('does not retain the universal Bugbot ports module', () => {
        expect(existsSync(join(portsDirectory, 'bugbot_ports.ts'))).toBe(false);
    });

    it('keeps Bugbot context and write capabilities separate', () => {
        for (const file of [
            'bugbot_issue_read_ports.ts',
            'bugbot_pull_request_read_ports.ts',
            'bugbot_issue_write_ports.ts',
            'bugbot_pull_request_write_ports.ts',
            'bugbot_context_ports.ts',
            'bugbot_write_ports.ts',
        ]) {
            expect(existsSync(join(portsDirectory, file))).toBe(true);
        }
    });
});
