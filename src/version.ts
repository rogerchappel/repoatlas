import { readFileSync } from 'node:fs';

type PackageMetadata = { version?: unknown };

const packageJsonUrl = new URL('../../package.json', import.meta.url);
const packageMetadata = JSON.parse(readFileSync(packageJsonUrl, 'utf8')) as PackageMetadata;

if (typeof packageMetadata.version !== 'string' || packageMetadata.version.length === 0) {
  throw new Error('package.json must declare a non-empty version');
}

export const VERSION = packageMetadata.version;
