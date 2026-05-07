import path from 'node:path';
import type { FileRole, Language } from './types.js';

const configNames = new Set(['package.json', 'tsconfig.json', 'pyproject.toml', 'requirements.txt', 'vite.config.ts', 'jest.config.js', 'vitest.config.ts', 'eslint.config.js', 'releasebox.config.json']);

export function detectLanguage(file: string): Language {
  const ext = path.extname(file).toLowerCase();
  if (['.js', '.jsx', '.mjs', '.cjs'].includes(ext)) return 'javascript';
  if (['.ts', '.tsx', '.mts', '.cts'].includes(ext)) return 'typescript';
  if (ext === '.py') return 'python';
  if (ext === '.json') return 'json';
  if (['.md', '.mdx'].includes(ext)) return 'markdown';
  if (['.yml', '.yaml'].includes(ext)) return 'yaml';
  if (['.sh', '.bash', '.zsh'].includes(ext)) return 'shell';
  return 'other';
}

export function classifyRole(file: string): FileRole {
  const normalized = file.split(path.sep).join('/');
  const base = path.basename(file);
  if (normalized.startsWith('.github/workflows/')) return 'ci';
  if (configNames.has(base) || base.startsWith('.')) return 'config';
  if (/(^|\/)(docs?|documentation|adr)(\/|$)/i.test(normalized) || /README|CHANGELOG|ROADMAP|SECURITY|CONTRIBUTING/i.test(base)) return 'docs';
  if (/(^|\/)(test|tests|__tests__|spec)(\/|$)/i.test(normalized) || /\.(test|spec)\.[cm]?[jt]sx?$/i.test(base) || /_test\.py$/i.test(base)) return 'test';
  if (/(^|\/)(migrations|schema|models)(\/|$)/i.test(normalized) || /schema\.(sql|prisma|ts|py)$/i.test(base)) return 'schema';
  if (/(^|\/)(routes?|pages|app\/api)(\/|$)/i.test(normalized) || /route\.[jt]sx?$/i.test(base)) return 'route';
  if (/(^|\/)(infra|terraform|k8s|docker)(\/|$)/i.test(normalized) || /^Dockerfile/.test(base)) return 'infra';
  if (/\.(png|jpe?g|gif|svg|css|scss|ico)$/i.test(base)) return 'asset';
  if (['javascript', 'typescript', 'python'].includes(detectLanguage(file))) return 'source';
  return 'unknown';
}
