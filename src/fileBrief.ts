import type { FileRecord, RepoAtlasIndex } from './types.js';

export function findFile(index: RepoAtlasIndex, target: string): FileRecord | undefined {
  const rel = target.replace(/^\.\//, '');
  return index.files.find((f) => f.path === rel) ?? index.files.find((f) => f.path.endsWith(rel));
}

export function formatFileBrief(file: FileRecord): string {
  const lines = [`File brief: ${file.path}`, '', `Role: ${file.role}`, `Language: ${file.language}`, `Bytes: ${file.bytes}`, ''];
  lines.push('Imports:');
  if (file.imports.length === 0) lines.push('- none');
  else file.imports.forEach((edge) => lines.push(`- ${edge.specifier} -> ${edge.to}${edge.resolved ? '' : ' (unresolved)'}`));
  lines.push('', 'Symbols:');
  if (file.symbols.length === 0) lines.push('- none');
  else file.symbols.forEach((symbol) => lines.push(`- ${symbol.kind} ${symbol.name} (line ${symbol.line})`));
  return `${lines.join('\n')}\n`;
}
