import type { RepoAtlasIndex } from './types.js';

export function summarizeIndex(index: RepoAtlasIndex) {
  const roles = countBy(index.files.map((f) => f.role));
  const languages = countBy(index.files.map((f) => f.language));
  return { files: index.files.length, edges: index.edges.length, roles, languages };
}

function countBy(values: string[]) {
  return values.reduce<Record<string, number>>((acc, value) => {
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
}
