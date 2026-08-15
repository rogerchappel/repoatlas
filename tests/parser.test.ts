import assert from 'node:assert/strict';
import { test } from 'node:test';
import { extractImports, resolveImport } from '../src/parser.js';

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

test('ignores import-like text in JavaScript comments and literals', () => {
  const source = `
    // import lineComment from './line-comment.js';
    /* export { blockComment } from './block-comment.js'; */
    const quoted = "require('./quoted.js')";
    const singleQuoted = 'import("./single-quoted.js")';
    const template = \`export * from './template.js';\`;

    import value from './static.js';
    export { helper } from './re-export.js';
    const commonjs = require('./commonjs.js');
    const dynamic = import('./dynamic.js');
  `;

  assert.deepEqual(
    extractImports('src/entry.ts', source, 'typescript', new Set()),
    [
      { from: 'src/entry.ts', to: './static.js', specifier: './static.js', kind: 'static', resolved: false },
      { from: 'src/entry.ts', to: './re-export.js', specifier: './re-export.js', kind: 'static', resolved: false },
      { from: 'src/entry.ts', to: './commonjs.js', specifier: './commonjs.js', kind: 'commonjs', resolved: false },
      { from: 'src/entry.ts', to: './dynamic.js', specifier: './dynamic.js', kind: 'dynamic', resolved: false }
    ]
  );
});
