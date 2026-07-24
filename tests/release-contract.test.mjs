import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const run = (env = {}, args = []) => spawnSync(
  process.execPath,
  ['scripts/release-contract.mjs', ...args],
  {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: { ...process.env, ...env },
  },
);

test('accepts a candidate newer than mocked npm metadata', () => {
  const result = run(
    { NPM_LATEST_VERSION: '0.1.3', RELEASE_TAG: 'v0.1.4' },
    ['--pack'],
  );
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /0\.1\.4 > npm 0\.1\.3, tag v0\.1\.4/);
});

test('rejects a candidate already published to npm', () => {
  const result = run({ NPM_LATEST_VERSION: '0.1.4' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Candidate 0\.1\.4 must be greater than npm latest 0\.1\.4/);
});

test('rejects a tag that differs from the package version', () => {
  const result = run({
    NPM_LATEST_VERSION: '0.1.3',
    RELEASE_TAG: 'v0.1.5',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Release tag v0\.1\.5 must equal v0\.1\.4/);
});
