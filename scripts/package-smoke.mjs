import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { handleMcpRequest } from '../dist/src/mcp.js';

const result = spawnSync('npm', ['pack', '--dry-run', '--json'], {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
});
if (result.status !== 0) {
  process.stderr.write(result.stderr || result.stdout);
  process.exit(result.status ?? 1);
}

const [pack] = JSON.parse(result.stdout);
const installDir = await mkdtemp(path.join(tmpdir(), 'repoatlas-package-smoke-'));
try {
  const tarball = path.join(installDir, pack.filename);
  const packed = spawnSync('npm', ['pack', '--pack-destination', installDir], { encoding: 'utf8' });
  if (packed.status !== 0) throw new Error(packed.stderr || packed.stdout);
  await writeFile(path.join(installDir, 'package.json'), '{"private":true,"type":"module"}');
  const install = spawnSync('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', tarball], {
    cwd: installDir, encoding: 'utf8',
  });
  if (install.status !== 0) throw new Error(install.stderr || install.stdout);
  const packageDir = path.join(installDir, 'node_modules', 'repoatlas');
  const installedPackage = JSON.parse(await readFile(path.join(packageDir, 'package.json'), 'utf8'));
  if (installedPackage.bin.repoatlas !== './dist/src/cli.js') throw new Error('Installed CLI entrypoint is incorrect');
  const imported = await import(path.join(packageDir, installedPackage.exports['.']));
  if (typeof imported.buildIndex !== 'function') throw new Error('Installed package import entrypoint is unavailable');
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await rm(installDir, { recursive: true, force: true });
}
const cliVersion = spawnSync(process.execPath, ['dist/src/cli.js', '--version'], {
  encoding: 'utf8',
});
if (cliVersion.status !== 0) {
  process.stderr.write(cliVersion.stderr || cliVersion.stdout);
  process.exit(cliVersion.status ?? 1);
}
if (cliVersion.stdout.trim() !== pack.version) {
  console.error(`CLI version ${cliVersion.stdout.trim()} must equal package version ${pack.version}`);
  process.exit(1);
}

const initialize = await handleMcpRequest({}, { id: 1, method: 'initialize' });
if (initialize.result.serverInfo.version !== pack.version) {
  console.error(`MCP version ${initialize.result.serverInfo.version} must equal package version ${pack.version}`);
  process.exit(1);
}

const included = new Set(pack.files.map(({ path }) => path));
const required = [
  'package.json', 'dist/src/cli.js', 'dist/src/index.js', 'README.md', 'LICENSE',
  'SECURITY.md', 'CHANGELOG.md', 'docs/RELEASE_CHECKLIST.md',
];
const missing = required.filter((path) => !included.has(path));
if (missing.length > 0) {
  console.error('Package tarball is missing required files:');
  for (const path of missing) console.error(`- ${path}`);
  process.exit(1);
}

const allowedRoots = new Set([
  'package.json', 'dist', 'docs', 'examples', 'README.md', 'LICENSE',
  'SECURITY.md', 'CHANGELOG.md', 'CONTRIBUTING.md', 'ROADMAP.md',
]);
const unexpected = [...included].filter((path) => !allowedRoots.has(path.split('/')[0]));
if (unexpected.length > 0) {
  console.error('Package tarball contains files outside the release allowlist:');
  for (const path of unexpected) console.error(`- ${path}`);
  process.exit(1);
}

console.log(`Package tarball and runtime version ${pack.version} verified (${included.size} files).`);
