import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const ignored = new Set(['.git', 'node_modules', 'dist', 'build', 'coverage', '.repoatlas', '.venv', '__pycache__']);

export async function walkFiles(root: string): Promise<string[]> {
  const out: string[] = [];
  async function visit(dir: string) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (ignored.has(entry.name)) continue;
      const abs = path.join(dir, entry.name);
      const rel = path.relative(root, abs).split(path.sep).join('/');
      if (entry.isDirectory()) await visit(abs);
      else if (entry.isFile()) {
        const s = await stat(abs);
        if (s.size <= 1_000_000) out.push(rel);
      }
    }
  }
  await visit(root);
  return out.sort();
}
