import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const parseVersion = (value, label) => {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(value);
  if (!match) throw new Error(`${label} is not a valid semantic version: ${value}`);
  return {
    value,
    parts: match.slice(1, 4).map(Number),
    prerelease: match[4] ?? null,
  };
};

const compareVersions = (left, right) => {
  for (let index = 0; index < 3; index += 1) {
    if (left.parts[index] !== right.parts[index]) {
      return left.parts[index] > right.parts[index] ? 1 : -1;
    }
  }
  if (left.prerelease === right.prerelease) return 0;
  if (left.prerelease === null) return 1;
  if (right.prerelease === null) return -1;
  return left.prerelease.localeCompare(right.prerelease, 'en', { numeric: true });
};

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const packageJson = readJson('package.json');
const packageLock = readJson('package-lock.json');
const candidate = parseVersion(packageJson.version, 'package.json version');

if (
  packageLock.version !== candidate.value
  || packageLock.packages?.['']?.version !== candidate.value
) {
  throw new Error('package.json and package-lock.json versions must match');
}

let latestValue = process.env.NPM_LATEST_VERSION;
if (!latestValue) {
  const result = spawnSync(
    'npm',
    ['view', packageJson.name, 'version', '--json'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );
  if (result.status !== 0) {
    throw new Error(`Unable to read npm latest version: ${result.stderr.trim()}`);
  }
  latestValue = JSON.parse(result.stdout);
}

const latest = parseVersion(latestValue, 'npm latest version');
if (compareVersions(candidate, latest) <= 0) {
  throw new Error(
    `Candidate ${candidate.value} must be greater than npm latest ${latest.value}`,
  );
}

const tag = process.env.RELEASE_TAG;
if (tag && tag !== `v${candidate.value}`) {
  throw new Error(`Release tag ${tag} must equal v${candidate.value}`);
}

if (process.argv.includes('--pack')) {
  const result = spawnSync(
    'npm',
    ['pack', '--dry-run', '--json'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );
  if (result.status !== 0) {
    throw new Error(`Unable to inspect package tarball: ${result.stderr.trim()}`);
  }
  const [pack] = JSON.parse(result.stdout);
  if (pack.version !== candidate.value) {
    throw new Error(
      `Packed version ${pack.version} must equal candidate ${candidate.value}`,
    );
  }
}

console.log(
  `Release contract verified: ${candidate.value} > npm ${latest.value}`
  + `${tag ? `, tag ${tag}` : ''}.`,
);
