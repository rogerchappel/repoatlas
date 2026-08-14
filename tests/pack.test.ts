import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { buildContextPack } from '../src/pack.js';
import type { FileRecord, RepoAtlasIndex } from '../src/types.js';

test('context packs skip oversized candidates and include later fitting files', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'repoatlas-pack-'));
  try {
    await writeFile(path.join(root, 'topic-huge.md'), 'x'.repeat(500));
    await writeFile(path.join(root, 'topic-small.md'), 'fits');
    const files = [file('topic-huge.md', 500), file('topic-small.md', 4)];
    const index: RepoAtlasIndex = {
      version: 1,
      root,
      generatedAt: '2026-08-14T00:00:00.000Z',
      files,
      edges: [],
    };

    const maxTokens = 25;
    const pack = await buildContextPack(index, 'topic', maxTokens);
    const content = pack.slice(pack.search(/^## /m));

    assert.doesNotMatch(pack, /## topic-huge\.md/);
    assert.match(pack, /## topic-small\.md/);
    assert.ok(content.length <= maxTokens * 4);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

function file(filePath: string, bytes: number): FileRecord {
  return {
    path: filePath,
    role: 'docs',
    language: 'markdown',
    bytes,
    imports: [],
    symbols: [],
  };
}
