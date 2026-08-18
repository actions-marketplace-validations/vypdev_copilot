/**
 * Integration-style tests for the findings/fixer capability adapters with mocked fetch.
 * Covers edge cases for the OpenCode-based architecture: missing config,
 * session/message failures, empty/invalid responses, JSON parsing, reasoning, getSessionDiff,
 * and retry behavior (OPENCODE_MAX_RETRIES).
 */

import { OPENCODE_MAX_RETRIES, OPENCODE_RETRY_DELAY_MS } from '../../../utils/constants';
import { FindingsAgentAdapter } from '../ai/findings_agent_adapter';
import { FixerAgentAdapter } from '../ai/fixer_agent_adapter';
import type { AgentCapabilityInfrastructure } from '../ai/agent_capability_adapter';
import { getSessionDiff } from '../opencode_session_diff_client';
import { Ai } from '../../model/ai';
import { OpenCodeHttpClient } from '../opencode_http_client';
import { OPENCODE_REQUEST_TIMEOUT_MS } from '../../../utils/constants';

jest.mock('../../../utils/logger', () => ({
  logDebugInfo: jest.fn(),
  logError: jest.fn(),
  logInfo: jest.fn(),
}));

const mockFetch = jest.fn();

function createAi(serverUrl = 'http://localhost:4096', model = 'opencode/kimi-k2.5') {
  return new Ai(serverUrl, model, false, false, [], false, 'low', 20);
}

function query(repository: FindingsAgentAdapter, ai: Ai, agentId: string, prompt: string, options: Record<string, unknown> = {}) {
  return repository.query({
    configuration: ai.getAgentConfiguration('findings'),
    agentId,
    prompt,
    options,
  });
}

function fix(repository: FixerAgentAdapter, ai: Ai, prompt: string) {
  return repository.fix({
    configuration: ai.getAgentConfiguration('fixer'),
    prompt,
  });
}

describe('Agent capability adapters', () => {
  let repo: FindingsAgentAdapter;
  let fixer: FixerAgentAdapter;



  beforeEach(() => {
    jest.useFakeTimers();
    const infrastructure: AgentCapabilityInfrastructure = {
      cli: { execute: jest.fn() },
      openCode: new OpenCodeHttpClient({ requestTimeoutMs: OPENCODE_REQUEST_TIMEOUT_MS }),
    };
    repo = new FindingsAgentAdapter(infrastructure);
    fixer = new FixerAgentAdapter(infrastructure);
    mockFetch.mockReset();
    (global as unknown as { fetch: typeof fetch }).fetch = mockFetch;
  });

  it('uses injected CLI port for findings without creating an HTTP adapter', async () => {
    const cli = { execute: jest.fn().mockResolvedValue('{"findings":[]}') };
    const http = { sendMessage: jest.fn() };
    const ai = new Ai('', '', false, false, [], false, 'low', 20, [], {
      findings: { provider: 'cursor', transport: 'cli', model: 'cursor', command: 'cursor-agent' },
      fixer: { provider: 'cursor', transport: 'cli', model: 'cursor', command: 'cursor-agent' },
    });
    const injectedRepo = new FindingsAgentAdapter({ cli, openCode: http });

    const result = await query(injectedRepo, ai, 'findings', 'inspect', { expectJson: true, schema: { type: 'object' } });

    expect(result).toEqual({ findings: [] });
    expect(cli.execute).toHaveBeenCalledTimes(1);
    expect(http.sendMessage).not.toHaveBeenCalled();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('askAgent', () => {
    it('returns undefined when server URL is missing', async () => {
      const ai = createAi('', 'opencode/model');
      const result = await query(repo, ai, 'plan', 'Assess progress', {});
      expect(result).toBeUndefined();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('returns undefined when session create fails after all retries', async () => {
      const ai = createAi();
      mockFetch.mockResolvedValue({ ok: false, status: 503, text: async () => 'Unavailable' });
      const promise = query(repo, ai, 'plan', 'Prompt', {});
      await jest.advanceTimersByTimeAsync((OPENCODE_MAX_RETRIES - 1) * OPENCODE_RETRY_DELAY_MS);
      const result = await promise;
      expect(result).toBeUndefined();
      expect(mockFetch).toHaveBeenCalledTimes(OPENCODE_MAX_RETRIES);
    });

    it('returns undefined when session create returns empty body after all retries', async () => {
      const ai = createAi();
      mockFetch.mockResolvedValue({ ok: true, text: async () => '' });
      const promise = query(repo, ai, 'plan', 'Prompt', {});
      await jest.advanceTimersByTimeAsync((OPENCODE_MAX_RETRIES - 1) * OPENCODE_RETRY_DELAY_MS);
      const result = await promise;
      expect(result).toBeUndefined();
      expect(mockFetch).toHaveBeenCalledTimes(OPENCODE_MAX_RETRIES);
    });

    it('returns undefined when agent message request fails after all retries', async () => {
      const ai = createAi();
      const sessionOk = { ok: true, text: async () => JSON.stringify({ id: 's1' }) };
      const messageFail = { ok: false, status: 500, text: async () => 'Agent error' };
      for (let i = 0; i < OPENCODE_MAX_RETRIES; i++) {
        mockFetch.mockResolvedValueOnce(sessionOk).mockResolvedValueOnce(messageFail);
      }
      const promise = query(repo, ai, 'plan', 'Prompt', {});
      await jest.advanceTimersByTimeAsync((OPENCODE_MAX_RETRIES - 1) * OPENCODE_RETRY_DELAY_MS);
      const result = await promise;
      expect(result).toBeUndefined();
      expect(mockFetch).toHaveBeenCalledTimes(OPENCODE_MAX_RETRIES * 2);
    });

    it('returns plain text when expectJson is false', async () => {
      const ai = createAi();
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          text: async () => JSON.stringify({ id: 's1' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              parts: [{ type: 'text', text: 'Just a string response' }],
            }),
        });
      const result = await query(repo, ai, 'plan', 'Prompt', {});
      expect(result).toBe('Just a string response');
    });

    it('returns parsed JSON when expectJson is true', async () => {
      const ai = createAi();
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          text: async () => JSON.stringify({ id: 's1' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              parts: [{ type: 'text', text: '{"progress": 75, "summary": "Almost done"}' }],
            }),
        });
      const result = await query(repo, ai, 'plan', 'Assess', {
        expectJson: true,
        schema: { type: 'object', properties: { progress: {}, summary: {} } },
      });
      expect(result).toEqual({ progress: 75, summary: 'Almost done' });
    });

    it('strips markdown code block from JSON when expectJson is true', async () => {
      const ai = createAi();
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          text: async () => JSON.stringify({ id: 's1' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              parts: [
                {
                  type: 'text',
                  text: '```json\n{"progress": 100, "summary": "Done"}\n```',
                },
              ],
            }),
        });
      const result = await query(repo, ai, 'plan', 'Assess', {
        expectJson: true,
        schema: {},
      });
      expect(result).toEqual({ progress: 100, summary: 'Done' });
    });

    it('parses JSON when agent adds prose before the JSON object (extract first {})', async () => {
      const ai = createAi();
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          text: async () => JSON.stringify({ id: 's1' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              parts: [
                {
                  type: 'text',
                  text: 'Based on my comprehensive analysis of the code changes between the branches, here is the assessment.\n\n{"progress": 80, "summary": "Almost done", "remaining": "Final review"}',
                },
              ],
            }),
        });
      const result = await query(repo, ai, 'plan', 'Assess', {
        expectJson: true,
        schema: {},
      });
      expect(result).toEqual({ progress: 80, summary: 'Almost done', remaining: 'Final review' });
    });

    it('includes reasoning in result when includeReasoning is true', async () => {
      const ai = createAi();
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          text: async () => JSON.stringify({ id: 's1' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              parts: [
                { type: 'reasoning', text: 'First I considered the diff.' },
                { type: 'text', text: '{"progress": 50, "summary": "Half"}' },
              ],
            }),
        });
      const result = await query(repo, ai, 'plan', 'Assess', {
        expectJson: true,
        schema: {},
        includeReasoning: true,
      });
      expect(result).toMatchObject({
        progress: 50,
        summary: 'Half',
        reasoning: 'First I considered the diff.',
      });
    });

    it('returns undefined when expectJson is true but response is invalid JSON after all retries', async () => {
      const ai = createAi();
      const sessionOk = { ok: true, text: async () => JSON.stringify({ id: 's1' }) };
      const messageInvalidJson = {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            parts: [{ type: 'text', text: 'not valid json at all' }],
          }),
      };
      for (let i = 0; i < OPENCODE_MAX_RETRIES; i++) {
        mockFetch.mockResolvedValueOnce(sessionOk).mockResolvedValueOnce(messageInvalidJson);
      }
      const promise = query(repo, ai, 'plan', 'Assess', { expectJson: true, schema: {} });
      await jest.advanceTimersByTimeAsync((OPENCODE_MAX_RETRIES - 1) * OPENCODE_RETRY_DELAY_MS);
      const result = await promise;
      expect(result).toBeUndefined();
      expect(mockFetch).toHaveBeenCalledTimes(OPENCODE_MAX_RETRIES * 2);
    });

    it('succeeds on parse retry when first response is invalid JSON and second is valid', async () => {
      const ai = createAi();
      const sessionOk = { ok: true, text: async () => JSON.stringify({ id: 's1' }) };
      mockFetch
        .mockResolvedValueOnce(sessionOk)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              parts: [{ type: 'text', text: 'not valid json' }],
            }),
        })
        .mockResolvedValueOnce(sessionOk)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              parts: [{ type: 'text', text: '{"progress": 80, "summary": "Done"}' }],
            }),
        });
      const promise = query(repo, ai, 'plan', 'Assess', { expectJson: true, schema: {} });
      await jest.advanceTimersByTimeAsync(OPENCODE_RETRY_DELAY_MS);
      const result = await promise;
      expect(result).toEqual({ progress: 80, summary: 'Done' });
      expect(mockFetch).toHaveBeenCalledTimes(4);
    });

    it('removes trailing slash from server URL', async () => {
      const ai = createAi('http://localhost:4096/', 'opencode/model');
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          text: async () => JSON.stringify({ id: 's1' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ parts: [{ type: 'text', text: 'OK' }] }),
        });
      await query(repo, ai, 'plan', 'P', {});
      expect(mockFetch).toHaveBeenNthCalledWith(1, 'http://localhost:4096/session', expect.any(Object));
    });

    it('uses session id from session.data.id when session.id is missing', async () => {
      const ai = createAi();
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          text: async () => JSON.stringify({ data: { id: 'sid-from-data' } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              parts: [{ type: 'text', text: '{"answer": "ok"}' }],
            }),
        });
      const result = await query(repo, ai, 'plan', 'P', {
        expectJson: true,
        schema: {},
      });
      expect(result).toEqual({ answer: 'ok' });
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('/session/sid-from-data/message'),
        expect.any(Object)
      );
    });

    it('returns undefined when expectJson is true but agent returns empty text part', async () => {
      const ai = createAi();
      const sessionOk = { ok: true, text: async () => JSON.stringify({ id: 's1' }) };
      const messageEmptyText = {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ parts: [{ type: 'text', text: '' }] }),
      };
      for (let i = 0; i < OPENCODE_MAX_RETRIES; i++) {
        mockFetch.mockResolvedValueOnce(sessionOk).mockResolvedValueOnce(messageEmptyText);
      }
      const promise = query(repo, ai, 'plan', 'P', { expectJson: true, schema: {} });
      await jest.advanceTimersByTimeAsync((OPENCODE_MAX_RETRIES - 1) * OPENCODE_RETRY_DELAY_MS);
      const result = await promise;
      expect(result).toBeUndefined();
      expect(mockFetch).toHaveBeenCalledTimes(OPENCODE_MAX_RETRIES * 2);
    });

    it('parses JSON with escaped quote inside string (extractFirstJsonObject)', async () => {
      const ai = createAi();
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          text: async () => JSON.stringify({ id: 's1' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              parts: [
                {
                  type: 'text',
                  text: 'Analysis. {"key": "value with \\"nested\\" quote", "n": 1}',
                },
              ],
            }),
        });
      const result = await query(repo, ai, 'plan', 'P', { expectJson: true, schema: {} });
      expect(result).toEqual({ key: 'value with "nested" quote', n: 1 });
    });

    it('returns undefined when expectJson and extracted JSON object is invalid', async () => {
      const ai = createAi();
      const sessionOk = { ok: true, text: async () => JSON.stringify({ id: 's1' }) };
      const messageInvalidExtracted = {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            parts: [{ type: 'text', text: 'Here is the result. { invalid json here }' }],
          }),
      };
      for (let i = 0; i < OPENCODE_MAX_RETRIES; i++) {
        mockFetch.mockResolvedValueOnce(sessionOk).mockResolvedValueOnce(messageInvalidExtracted);
      }
      const promise = query(repo, ai, 'plan', 'P', { expectJson: true, schema: {} });
      await jest.advanceTimersByTimeAsync((OPENCODE_MAX_RETRIES - 1) * OPENCODE_RETRY_DELAY_MS);
      const result = await promise;
      expect(result).toBeUndefined();
    });

    it('returns undefined when message response has empty parts array (empty text throws and retries exhaust)', async () => {
      const ai = createAi();
      const sessionOk = { ok: true, text: async () => JSON.stringify({ id: 's1' }) };
      const messageEmptyParts = {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ parts: [] }),
      };
      for (let i = 0; i < OPENCODE_MAX_RETRIES; i++) {
        mockFetch.mockResolvedValueOnce(sessionOk).mockResolvedValueOnce(messageEmptyParts);
      }
      const promise = query(repo, ai, 'plan', 'P', {});
      await jest.advanceTimersByTimeAsync((OPENCODE_MAX_RETRIES - 1) * OPENCODE_RETRY_DELAY_MS);
      const result = await promise;
      expect(result).toBeUndefined();
      expect(mockFetch).toHaveBeenCalledTimes(OPENCODE_MAX_RETRIES * 2);
    });

    it('returns undefined when expectJson is true but response has no JSON object (no curly brace)', async () => {
      const ai = createAi();
      const sessionOk = { ok: true, text: async () => JSON.stringify({ id: 's1' }) };
      const messageNoJson = {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            parts: [{ type: 'text', text: 'No JSON here, just plain text.' }],
          }),
      };
      for (let i = 0; i < OPENCODE_MAX_RETRIES; i++) {
        mockFetch.mockResolvedValueOnce(sessionOk).mockResolvedValueOnce(messageNoJson);
      }
      const promise = query(repo, ai, 'plan', 'P', { expectJson: true, schema: {} });
      await jest.advanceTimersByTimeAsync((OPENCODE_MAX_RETRIES - 1) * OPENCODE_RETRY_DELAY_MS);
      const result = await promise;
      expect(result).toBeUndefined();
    });

    it('returns undefined when session create returns invalid JSON (error with cause)', async () => {
      const ai = createAi();
      mockFetch.mockResolvedValue({ ok: true, text: async () => 'not valid json' });
      const promise = query(repo, ai, 'plan', 'P', {});
      await jest.advanceTimersByTimeAsync((OPENCODE_MAX_RETRIES - 1) * OPENCODE_RETRY_DELAY_MS);
      const result = await promise;
      expect(result).toBeUndefined();
      expect(mockFetch).toHaveBeenCalledTimes(OPENCODE_MAX_RETRIES);
    });

    it('hits single-quote path in extractor when response has single-quoted object (invalid JSON)', async () => {
      const ai = createAi();
      const sessionOk = { ok: true, text: async () => JSON.stringify({ id: 's1' }) };
      const messageSingleQuote = {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            parts: [{ type: 'text', text: "Note { 'a': 1 }" }],
          }),
      };
      for (let i = 0; i < OPENCODE_MAX_RETRIES; i++) {
        mockFetch.mockResolvedValueOnce(sessionOk).mockResolvedValueOnce(messageSingleQuote);
      }
      const promise = query(repo, ai, 'plan', 'P', { expectJson: true, schema: {} });
      await jest.advanceTimersByTimeAsync((OPENCODE_MAX_RETRIES - 1) * OPENCODE_RETRY_DELAY_MS);
      const result = await promise;
      expect(result).toBeUndefined();
    });
  });

  describe('copilotMessage', () => {
    it('returns undefined when model is missing', async () => {
      const ai = createAi('http://localhost:4096', '');
      const result = await fix(fixer, ai, 'Do something');
      expect(result).toBeUndefined();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('returns undefined when build agent request fails after all retries', async () => {
      const ai = createAi();
      const sessionOk = { ok: true, text: async () => JSON.stringify({ id: 's1' }) };
      const messageFail = { ok: false, status: 500, text: async () => 'Error' };
      for (let i = 0; i < OPENCODE_MAX_RETRIES; i++) {
        mockFetch.mockResolvedValueOnce(sessionOk).mockResolvedValueOnce(messageFail);
      }
      const promise = fix(fixer, ai, 'Edit file');
      await jest.advanceTimersByTimeAsync((OPENCODE_MAX_RETRIES - 1) * OPENCODE_RETRY_DELAY_MS);
      const result = await promise;
      expect(result).toBeUndefined();
      expect(mockFetch).toHaveBeenCalledTimes(OPENCODE_MAX_RETRIES * 2);
    });

    it('returns text and sessionId on success', async () => {
      const ai = createAi();
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          text: async () => JSON.stringify({ id: 'copilot-session-1' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              parts: [{ type: 'text', text: 'I updated the file.' }],
            }),
        });
      const result = await fix(fixer, ai, 'Edit file');
      expect(result).toEqual({ text: 'I updated the file.', sessionId: 'copilot-session-1' });
    });
  });
});

describe('getSessionDiff', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockFetch.mockReset();
    (global as unknown as { fetch: typeof fetch }).fetch = mockFetch;
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('returns empty array when response is not ok', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });
    const result = await getSessionDiff('http://localhost:4096', 'sess-1');
    expect(result).toEqual([]);
  });

  it('returns empty array when body is empty', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, text: async () => '' });
    const result = await getSessionDiff('http://localhost:4096', 'sess-1');
    expect(result).toEqual([]);
  });

  it('returns empty array when body is invalid JSON', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, text: async () => 'invalid' });
    const result = await getSessionDiff('http://localhost:4096', 'sess-1');
    expect(result).toEqual([]);
  });

  it('returns array when response is array of diffs', async () => {
    const diffs = [{ path: 'src/foo.ts', file: 'content' }];
    mockFetch.mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify(diffs) });
    const result = await getSessionDiff('http://localhost:4096', 'sess-1');
    expect(result).toEqual(diffs);
  });

  it('returns data array when response is { data: [...] }', async () => {
    const diffs = [{ path: 'a.ts' }];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ data: diffs }),
    });
    const result = await getSessionDiff('http://localhost:4096', 'sess-1');
    expect(result).toEqual(diffs);
  });

  it('strips trailing slash from base URL', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, text: async () => '[]' });
    await getSessionDiff('http://localhost:4096/', 's1');
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:4096/session/s1/diff', expect.any(Object));
  });
});
