import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { RepoAtlasIndex } from './types.js';

export async function buildContextPack(index: RepoAtlasIndex, topic: string, maxTokens = 8000): Promise<string> {
  const terms = topic.toLowerCase().split(/\W+/).filter(Boolean);
  const scored = index.files.map((file) => ({ file, score: scoreFile(file.path, terms) + file.symbols.filter((s) => terms.some((t) => s.name.toLowerCase().includes(t))).length * 3 }))
    .filter((x) => x.score > 0 || x.file.role === 'docs')
    .sort((a, b) => b.score - a.score || a.file.path.localeCompare(b.file.path));
  const budget = maxTokens * 4;
  let used = 0;
  const chunks = [`# repoatlas context pack`, ``, `Topic: ${topic}`, `Root: ${index.root}`, ``];
  for (const { file } of scored.slice(0, 20)) {
    const header = `## ${file.path}\nrole=${file.role} language=${file.language} bytes=${file.bytes}\n`;
    const body = await readSnippet(index.root, file.path);
    const block = `${header}\n\`\`\`\n${body}\n\`\`\`\n`;
    if (used + block.length > budget) break;
    chunks.push(block);
    used += block.length;
  }
  return `${chunks.join('\n')}\n`;
}

function scoreFile(file: string, terms: string[]) { return terms.reduce((sum, term) => sum + (file.toLowerCase().includes(term) ? 5 : 0), 0); }
async function readSnippet(root: string, file: string) {
  const text = await readFile(path.join(root, file), 'utf8').catch(() => '');
  return text.split(/\r?\n/).slice(0, 80).join('\n');
}
