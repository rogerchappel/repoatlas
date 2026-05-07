import assert from 'node:assert/strict';
import { mkdtemp, cp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { test } from 'node:test';

const run = promisify(execFile);
const fixture = new URL('./fixtures/mixed-repo/', import.meta.url).pathname;
const cli = new URL('../dist/cli.js', import.meta.url).pathname;

test('CLI indexes, briefs, packs, asks, and serves MCP tools', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'repoatlas-'));
  try {
    await cp(fixture, dir, { recursive: true });
    const index = await run('node', [cli, 'index', dir]);
    assert.match(index.stdout, /Indexed \d+ files/);
    const impact = await run('node', [cli, 'impact', 'src/routes/social.ts', '--root', dir]);
    assert.match(impact.stdout, /Likely dependents:/);
    assert.match(impact.stdout, /tests\/social.routes.test.ts/);
    const file = await run('node', [cli, 'file', 'src/routes/social.ts', '--root', dir]);
    assert.match(file.stdout, /registerSocialRoutes/);
    const pack = await run('node', [cli, 'pack', '--root', dir, '--topic', 'social publishing', '--max-tokens', '1200']);
    assert.match(pack.stdout, /repoatlas context pack/);
    const ask = await run('node', [cli, 'ask', 'DatabaseQueue', '--root', dir]);
    assert.match(ask.stdout, /src\/lib\/db.ts/);
    const mcp = await runWithInput('node', [cli, 'mcp', '--root', dir, '--stdio'], '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/list\"}\n');
    assert.match(mcp.stdout, /repoatlas_impact/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

function runWithInput(command: string, args: string[], input: string): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => code === 0 ? resolve({ stdout, stderr }) : reject(new Error(`exit ${code}: ${stderr}`)));
    child.stdin.end(input);
  });
}
