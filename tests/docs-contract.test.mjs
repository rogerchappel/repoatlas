import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('PRD verification commands name executable package scripts', async () => {
  const [prd, packageJson] = await Promise.all([
    readFile('docs/PRD.md', 'utf8'),
    readFile('package.json', 'utf8').then(JSON.parse),
  ]);
  const suggested = prd.match(/Suggested verification:\n((?:- [^\n]+\n?)+)/);
  assert.ok(suggested, 'docs/PRD.md must contain npm run verification commands');

  const commands = [...suggested[1].matchAll(/`npm run ([^\s`]+)`/g)].map((match) => match[1]);
  assert.deepEqual(commands, ['test:social', 'check']);
  for (const command of commands) {
    assert.equal(typeof packageJson.scripts?.[command], 'string', `missing package script: ${command}`);
  }
});

test('documented social verification selects only the intended CLI integration test', () => {
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  const result = spawnSync('npm', ['run', '--silent', 'test:social'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env,
  });
  assert.equal(result.status, 0, result.stderr);
  const output = `${result.stdout}\n${result.stderr}`;
  assert.match(output, /CLI indexes, briefs, packs, asks, and serves MCP tools/);
  assert.match(output, /tests 1\b/);
  assert.match(output, /pass 1\b/);
  assert.match(output, /skipped 0\b/);
});
