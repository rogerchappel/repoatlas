import { spawnSync } from 'node:child_process';

const result = spawnSync('npm', ['pack', '--dry-run', '--json'], {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
});
if (result.status !== 0) {
  process.stderr.write(result.stderr || result.stdout);
  process.exit(result.status ?? 1);
}

const [pack] = JSON.parse(result.stdout);
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

console.log(`Package tarball verified (${included.size} files).`);
