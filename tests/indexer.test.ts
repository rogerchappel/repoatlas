import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildIndex } from '../src/indexer.js';
import { buildImpactBrief } from '../src/impact.js';

const root = new URL('./fixtures/mixed-repo/', import.meta.url).pathname;

test('indexes fixture files with deterministic import edges', async () => {
  const index = await buildIndex(root);
  assert.equal(index.generatedAt, '1970-01-01T00:00:00.000Z');
  assert.ok(index.files.find((f) => f.path === 'src/routes/social.ts'));
  assert.ok(index.edges.find((e) => e.from === 'src/app.ts' && e.to === 'src/routes/social.ts'));
  assert.ok(index.edges.find((e) => e.from === 'src/routes/social.ts' && e.to === 'src/lib/db.ts'));
  assert.ok(index.edges.find((e) => e.from === 'src/worker.py' && e.to === 'services/publisher.py'));
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
