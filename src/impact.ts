import path from 'node:path';
import type { ImpactBrief, RepoAtlasIndex } from './types.js';

export function buildImpactBrief(index: RepoAtlasIndex, target: string): ImpactBrief {
  const normalized = normalizeTarget(index, target);
  const targetFile = index.files.find((f) => f.path === normalized);
  const dependents = transitiveDependents(index, normalized).sort();
  const directDeps = index.edges.filter((e) => e.from === normalized && e.resolved).map((e) => e.to).sort();
  const likelyTests = findLikelyTests(index, normalized, dependents);
  const relevantDocs = relevantByRole(index, 'docs', normalized);
  const relevantConfig = [...relevantByRole(index, 'config', normalized), ...relevantByRole(index, 'ci', normalized)].sort();
  const evidence = [normalized, ...dependents.slice(0, 8), ...directDeps.slice(0, 5), ...likelyTests.slice(0, 5)].filter(Boolean);
  const confidence = targetFile && (dependents.length > 0 || directDeps.length > 0) ? 'high' : targetFile ? 'medium' : 'low';
  return { target: normalized, targetFile, dependents, dependencies: directDeps, likelyTests, relevantDocs, relevantConfig, confidence, evidence: [...new Set(evidence)] };
}

export function formatImpactBrief(brief: ImpactBrief): string {
  const lines = [`Impact brief: ${brief.target}`, '', `Confidence: ${brief.confidence}`, ''];
  section(lines, 'Likely dependents', brief.dependents);
  section(lines, 'Direct dependencies', brief.dependencies);
  section(lines, 'Likely tests', brief.likelyTests);
  section(lines, 'Relevant docs', brief.relevantDocs);
  section(lines, 'Relevant config/CI', brief.relevantConfig);
  section(lines, 'Evidence paths', brief.evidence);
  return `${lines.join('\n')}\n`;
}

function section(lines: string[], title: string, values: string[]) {
  lines.push(`${title}:`);
  if (values.length === 0) lines.push('- none found');
  else values.forEach((value) => lines.push(`- ${value}`));
  lines.push('');
}

function transitiveDependents(index: RepoAtlasIndex, target: string): string[] {
  const seen = new Set<string>();
  const queue = [target];
  while (queue.length) {
    const current = queue.shift()!;
    for (const edge of index.edges.filter((e) => e.to === current && e.resolved)) {
      if (!seen.has(edge.from)) { seen.add(edge.from); queue.push(edge.from); }
    }
  }
  seen.delete(target);
  return [...seen];
}

function findLikelyTests(index: RepoAtlasIndex, target: string, dependents: string[]): string[] {
  const stem = path.posix.basename(target).replace(/\.[^.]+$/, '').replace(/\.(test|spec)$/, '');
  const candidates = index.files.filter((f) => f.role === 'test');
  const byImport = candidates.filter((f) => f.imports.some((e) => e.to === target || dependents.includes(e.to))).map((f) => f.path);
  const byName = candidates.filter((f) => f.path.toLowerCase().includes(stem.toLowerCase())).map((f) => f.path);
  return [...new Set([...byImport, ...byName])].sort();
}

function relevantByRole(index: RepoAtlasIndex, role: 'docs' | 'config' | 'ci', target: string): string[] {
  const parts = target.toLowerCase().split('/').filter((p) => p.length > 2).map((p) => p.replace(/\.[^.]+$/, ''));
  return index.files.filter((f) => f.role === role).filter((f) => parts.some((p) => f.path.toLowerCase().includes(p)) || role !== 'docs').map((f) => f.path).slice(0, 10).sort();
}

function normalizeTarget(index: RepoAtlasIndex, target: string): string {
  const rel = target.split(path.sep).join('/').replace(/^\.\//, '');
  if (index.files.some((f) => f.path === rel)) return rel;
  const found = index.files.find((f) => f.path.endsWith(`/${rel}`) || f.path.endsWith(rel));
  return found?.path ?? rel;
}
