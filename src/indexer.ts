import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { extractImports, extractSymbols } from './parser.js';
import { classifyRole, detectLanguage } from './roles.js';
import type { RepoAtlasIndex } from './types.js';
import { walkFiles } from './walk.js';

export const INDEX_DIR = '.repoatlas';
export const INDEX_FILE = 'index.json';

export async function buildIndex(root: string): Promise<RepoAtlasIndex> {
  const resolvedRoot = path.resolve(root);
  const files = await walkFiles(resolvedRoot);
  const fileSet = new Set(files);
  const records = [];
  for (const file of files) {
    const abs = path.join(resolvedRoot, file);
    const source = await readFile(abs, 'utf8').catch(() => '');
    const language = detectLanguage(file);
    const imports = extractImports(file, source, language, fileSet);
    const symbols = extractSymbols(file, source, language);
    records.push({ path: file, role: classifyRole(file), language, bytes: Buffer.byteLength(source), imports, symbols });
  }
  return { version: 1, root: resolvedRoot, generatedAt: new Date(0).toISOString(), files: records, edges: records.flatMap((f) => f.imports) };
}

export async function writeIndex(index: RepoAtlasIndex, root = index.root): Promise<string> {
  const dir = path.join(root, INDEX_DIR);
  await mkdir(dir, { recursive: true });
  const target = path.join(dir, INDEX_FILE);
  await writeFile(target, `${JSON.stringify(index, null, 2)}\n`);
  return target;
}

export async function loadIndex(root: string): Promise<RepoAtlasIndex> {
  const target = path.join(path.resolve(root), INDEX_DIR, INDEX_FILE);
  return JSON.parse(await readFile(target, 'utf8')) as RepoAtlasIndex;
}
