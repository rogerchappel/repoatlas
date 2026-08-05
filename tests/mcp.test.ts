import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildIndex } from '../src/indexer.js';
import { handleMcpRequest } from '../src/mcp.js';

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
  assert.ok('result' in defaulted);
  const safeIntegerBoundary = await call(Number.MAX_SAFE_INTEGER);
  assert.ok('result' in safeIntegerBoundary);
});

function getResult(response: { result: unknown } | { error: unknown }): unknown {
  assert.ok('result' in response);
  return response.result;
}
