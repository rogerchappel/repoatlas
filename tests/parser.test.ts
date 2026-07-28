import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveImport } from '../src/parser.js';

test('maps emitted JavaScript extensions to TypeScript source files', () => {
  const files = new Set([
    'src/plain.ts',
    'src/component.tsx',
    'src/module.mts',
    'src/common.cts'
  ]);

  assert.equal(resolveImport('src/entry.ts', './plain.js', files), 'src/plain.ts');
  assert.equal(resolveImport('src/entry.ts', './component.jsx', files), 'src/component.tsx');
  assert.equal(resolveImport('src/entry.ts', './module.mjs', files), 'src/module.mts');
  assert.equal(resolveImport('src/entry.ts', './common.cjs', files), 'src/common.cts');
});

test('prefers a genuine JavaScript target over a TypeScript counterpart', () => {
  const files = new Set(['src/helper.js', 'src/helper.ts']);

  assert.equal(resolveImport('src/entry.ts', './helper.js', files), 'src/helper.js');
});
