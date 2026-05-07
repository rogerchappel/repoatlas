import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildIndex } from '../src/indexer.js';

test('runtime code has no http fetch dependency', async () => {
  const files = ['src/indexer.ts', 'src/cli.ts', 'src/mcp.ts'];
  const text = (await Promise.all(files.map((f) => readFile(f, 'utf8')))).join('\n');
  assert.equal(/fetch\(|https?:\/\//.test(text), false);
});

test('indexing skips common local secret files', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'repoatlas-privacy-'));
  await writeFile(path.join(dir, '.env'), 'TOKEN=secret\n');
  await writeFile(path.join(dir, '.npmrc'), '//registry.npmjs.org/:_authToken=secret\n');
  await writeFile(path.join(dir, 'deploy.pem'), 'private key\n');
  await writeFile(path.join(dir, 'src.ts'), 'export const safe = true;\n');

  const index = await buildIndex(dir);
  assert.deepEqual(index.files.map((file) => file.path), ['src.ts']);
});
