import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildIndex } from '../src/indexer.js';
import { summarizeIndex } from '../src/summary.js';

const root = new URL('./tests/fixtures/mixed-repo/', `file://${process.cwd()}/`).pathname;

test('summarizes roles and languages', async () => {
  const summary = summarizeIndex(await buildIndex(root));
  assert.ok(summary.roles.route >= 1);
  assert.ok(summary.languages.typescript >= 3);
});
