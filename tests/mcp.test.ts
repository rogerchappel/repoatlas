import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import { test } from 'node:test';
import { buildIndex } from '../src/indexer.js';
import { handleMcpRequest, runMcpStdio } from '../src/mcp.js';

const fixture = new URL('./tests/fixtures/mixed-repo/', `file://${process.cwd()}/`).pathname;

test('context pack tool schema requires a positive safe integer token budget', async () => {
  const response = await handleMcpRequest(await buildIndex(fixture), { id: 1, method: 'tools/list' });
  const tools = (getResult(response) as { tools: Array<{ name: string; inputSchema: { properties: Record<string, unknown> } }> }).tools;
  const tool = tools.find(({ name }) => name === 'repoatlas_context_pack');

  assert.deepEqual(tool?.inputSchema.properties.maxTokens, {
    type: 'integer',
    minimum: 1,
    maximum: Number.MAX_SAFE_INTEGER,
  });
});

test('context pack tool rejects invalid token budgets without coercion', async () => {
  const index = await buildIndex(fixture);
  const invalidValues = [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1, '1200', 'nope', null, true];

  for (const maxTokens of invalidValues) {
    const response = await handleMcpRequest(index, {
      id: 2,
      method: 'tools/call',
      params: { name: 'repoatlas_context_pack', arguments: { topic: 'social', maxTokens } },
    });
    assert.deepEqual(response, {
      jsonrpc: '2.0',
      id: 2,
      error: { code: -32602, message: 'Invalid params: maxTokens must be a positive safe integer' },
    });
  }
});

test('context pack tool accepts defaults and enforces valid boundary budgets', async () => {
  const index = await buildIndex(fixture);
  const call = (maxTokens?: number) => handleMcpRequest(index, {
    id: 3,
    method: 'tools/call',
    params: {
      name: 'repoatlas_context_pack',
      arguments: { topic: 'social', ...(maxTokens === undefined ? {} : { maxTokens }) },
    },
  });

  const minimal = await call(1);
  const minimalText = (getResult(minimal) as { content: Array<{ text: string }> }).content[0].text;
  assert.match(minimalText, /repoatlas context pack/);
  assert.doesNotMatch(minimalText, /^## /m);

  const budget = 1200;
  const bounded = await call(budget);
  const boundedText = (getResult(bounded) as { content: Array<{ text: string }> }).content[0].text;
  const contentStart = boundedText.search(/^## /m);
  assert.notEqual(contentStart, -1);
  assert.ok(boundedText.slice(contentStart).length <= budget * 4);

  const defaulted = await call();
  assert.ok(defaulted && 'result' in defaulted);
  const safeIntegerBoundary = await call(Number.MAX_SAFE_INTEGER);
  assert.ok(safeIntegerBoundary && 'result' in safeIntegerBoundary);
});

test('request routing returns method not found while valid requests still work', async () => {
  const index = await buildIndex(fixture);
  assert.deepEqual(await handleMcpRequest(index, { id: 7, method: 'does/not/exist' }), {
    jsonrpc: '2.0',
    id: 7,
    error: { code: -32601, message: 'Method not found: does/not/exist' },
  });
  const response = await handleMcpRequest(index, { id: 8, method: 'tools/list' });
  assert.ok('result' in response!);
});

test('tools reject missing and wrong-typed required arguments', async () => {
  const index = await buildIndex(fixture);
  const cases = [
    ['repoatlas_search', {}, 'query'],
    ['repoatlas_search', { query: 42 }, 'query'],
    ['repoatlas_impact', {}, 'target'],
    ['repoatlas_file_brief', { target: false }, 'target'],
    ['repoatlas_context_pack', {}, 'topic'],
    ['repoatlas_context_pack', { topic: null }, 'topic'],
  ] as const;

  for (const [name, args, field] of cases) {
    assert.deepEqual(await handleMcpRequest(index, {
      id: 9,
      method: 'tools/call',
      params: { name, arguments: args },
    }), {
      jsonrpc: '2.0',
      id: 9,
      error: { code: -32602, message: `Invalid params: ${field} must be a string` },
    });
  }
});

test('stdio emits no response for notifications and continues with requests', async () => {
  const index = await buildIndex(fixture);
  const input = new PassThrough();
  const output = new PassThrough();
  let written = '';
  output.setEncoding('utf8');
  output.on('data', (chunk) => { written += chunk; });

  const running = runMcpStdio(index, input, output);
  input.end([
    JSON.stringify({ jsonrpc: '2.0', method: 'tools/list' }),
    JSON.stringify({ jsonrpc: '2.0', id: 10, method: 'tools/list' }),
    '',
  ].join('\n'));
  await running;

  const responses = written.trim().split('\n').map((line) => JSON.parse(line));
  assert.equal(responses.length, 1);
  assert.equal(responses[0].id, 10);
  assert.ok(Array.isArray(responses[0].result.tools));
});

test('stdio reports malformed frames and continues with the next request', async () => {
  const responses = await exchangeMcpFrames([
    '{bad json',
    JSON.stringify({ jsonrpc: '2.0', id: 11, method: 'tools/list' }),
    '',
  ].join('\n'));

  assert.deepEqual(responses[0], {
    jsonrpc: '2.0',
    id: null,
    error: { code: -32700, message: 'Parse error' },
  });
  assert.equal(responses[1].id, 11);
  assert.ok(Array.isArray(responses[1].result.tools));
});

test('stdio processes one complete trailing request at EOF without a newline', async () => {
  const responses = await exchangeMcpFrames(
    JSON.stringify({ jsonrpc: '2.0', id: 12, method: 'tools/list' }),
  );

  assert.equal(responses.length, 1);
  assert.equal(responses[0].id, 12);
  assert.ok(Array.isArray(responses[0].result.tools));
});

async function exchangeMcpFrames(payload: string): Promise<any[]> {
  const input = new PassThrough();
  const output = new PassThrough();
  let written = '';
  output.setEncoding('utf8');
  output.on('data', (chunk) => { written += chunk; });

  const running = runMcpStdio(await buildIndex(fixture), input, output);
  input.end(payload);
  await running;
  return written.trim().split('\n').filter(Boolean).map((line) => JSON.parse(line));
}

function getResult(response: { result: unknown } | { error: unknown } | undefined): unknown {
  assert.ok(response && 'result' in response);
  return response.result;
}
