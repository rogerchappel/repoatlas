import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';

test('runtime code has no http fetch dependency', async () => {
  const files = ['src/indexer.ts', 'src/cli.ts', 'src/mcp.ts'];
  const text = (await Promise.all(files.map((f) => readFile(f, 'utf8')))).join('\n');
  assert.equal(/fetch\(|https?:\/\//.test(text), false);
});
