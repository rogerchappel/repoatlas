import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildIndex } from '../src/indexer.js';
import { buildImpactBrief } from '../src/impact.js';
import { extractImports } from '../src/parser.js';

const root = new URL('./tests/fixtures/mixed-repo/', `file://${process.cwd()}/`).pathname;

test('indexes fixture files with deterministic import edges', async () => {
  const index = await buildIndex(root);
  assert.equal(index.generatedAt, '1970-01-01T00:00:00.000Z');
  assert.ok(index.files.find((f) => f.path === 'src/routes/social.ts'));
  assert.ok(index.edges.find((e) => e.from === 'src/app.ts' && e.to === 'src/routes/social.ts'));
  assert.ok(index.edges.find((e) => e.from === 'src/routes/social.ts' && e.to === 'src/lib/db.ts'));
  assert.ok(index.edges.find((e) => e.from === 'src/worker.py' && e.to === 'services/publisher.py'));
  assert.deepEqual(
    index.edges.filter((edge) => edge.from === 'src/worker.py'),
    [
      { from: 'src/worker.py', to: 'services/publisher.py', specifier: 'services.publisher', kind: 'python', resolved: true },
      { from: 'src/worker.py', to: 'services/alpha.py', specifier: 'services.alpha', kind: 'python', resolved: true },
      { from: 'src/worker.py', to: 'services/beta.py', specifier: 'services.beta', kind: 'python', resolved: true },
      { from: 'src/worker.py', to: 'src/helper_module.py', specifier: '.helper_module', kind: 'python', resolved: true }
    ]
  );
});

test('classifies roles and symbols', async () => {
  const index = await buildIndex(root);
  const social = index.files.find((f) => f.path === 'src/routes/social.ts');
  assert.equal(social?.role, 'route');
  assert.ok(social?.symbols.some((s) => s.name === 'registerSocialRoutes'));
  assert.equal(index.files.find((f) => f.path === 'tests/social.routes.test.ts')?.role, 'test');
});

test('impact brief cites dependents, tests, and docs', async () => {
  const index = await buildIndex(root);
  const brief = buildImpactBrief(index, 'src/routes/social.ts');
  assert.deepEqual(brief.dependents, ['src/app.ts', 'tests/social.routes.test.ts']);
  assert.ok(brief.likelyTests.includes('tests/social.routes.test.ts'));
  assert.ok(brief.relevantDocs.includes('docs/social.md'));
  assert.ok(brief.evidence.includes('src/routes/social.ts'));
});

test('indexes imports inside executable template substitutions', () => {
  const files = new Set(['src/app.ts', 'src/real.ts', 'src/required.ts']);
  const source = [
    'const rendered = `literal import("ignored-package") ${await import("./real.js")}`;',
    'const nested = `outer ${`inner ${require("./required.js")}`}`;'
  ].join('\n');

  assert.deepEqual(extractImports('src/app.ts', source, 'typescript', files), [
    { from: 'src/app.ts', to: 'src/required.ts', specifier: './required.js', kind: 'commonjs', resolved: true },
    { from: 'src/app.ts', to: 'src/real.ts', specifier: './real.js', kind: 'dynamic', resolved: true }
  ]);
});

test('ignores import-like text inside regex literals', () => {
  const files = new Set(['src/app.ts', 'src/real.ts']);
  const source = [
    'const detector = /import("fake-package")/gi;',
    'const required = /require("also-fake")/;',
    'const ratio = total / divisor;',
    'const loaded = import("./real.js");'
  ].join('\n');

  assert.deepEqual(extractImports('src/app.ts', source, 'typescript', files), [
    { from: 'src/app.ts', to: 'src/real.ts', specifier: './real.js', kind: 'dynamic', resolved: true }
  ]);
});
