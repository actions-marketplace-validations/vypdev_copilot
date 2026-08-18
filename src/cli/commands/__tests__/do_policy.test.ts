import { buildDoAgentTasks, formatDoJsonResponse } from '../do_policy';

describe('do command policy', () => {
  it('builds independent findings and fixer configurations', () => {
    const tasks = buildDoAgentTasks({
      agentProvider: 'opencode', agentTransport: 'server', agentModel: 'main', opencodeServerUrl: 'http://agent',
      findingsProvider: 'codex', findingsTransport: 'cli', findingsModel: 'findings', findingsCommand: 'codex',
      fixerProvider: 'opencode', fixerTransport: 'server', fixerModel: 'fixer',
    });
    expect(tasks.findings).toMatchObject({ provider: 'codex', transport: 'cli', model: 'findings', command: 'codex' });
    expect(tasks.fixer).toMatchObject({ provider: 'opencode', transport: 'server', model: 'fixer', serverUrl: 'http://agent' });
  });

  it('uses environment defaults when command options are absent', () => {
    const tasks = buildDoAgentTasks({});
    expect(tasks.findings.provider).toBe('opencode');
    expect(tasks.findings.transport).toBe('server');
    expect(tasks.findings.serverUrl).toBe('http://127.0.0.1:4096');
  });

  it('serializes the stable JSON output contract', () => {
    expect(formatDoJsonResponse('done', 'session-1')).toBe(JSON.stringify({ response: 'done', sessionId: 'session-1' }, null, 2));
  });
});
