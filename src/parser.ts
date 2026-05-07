import path from 'node:path';
import type { ImportEdge, Language, SymbolRecord } from './types.js';

export function extractImports(file: string, source: string, language: Language, allFiles: Set<string>): ImportEdge[] {
  if (language === 'javascript' || language === 'typescript') return extractJsTsImports(file, source, allFiles);
  if (language === 'python') return extractPythonImports(file, source, allFiles);
  return [];
}

export function extractSymbols(file: string, source: string, language: Language): SymbolRecord[] {
  const symbols: SymbolRecord[] = [];
  const lines = source.split(/\r?\n/);
  lines.forEach((line, i) => {
    const lineNo = i + 1;
    const trimmed = line.trim();
    const fn = /^(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/.exec(trimmed) ?? /^(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(/.exec(trimmed);
    const klass = /^(?:export\s+)?class\s+([A-Za-z_$][\w$]*)/.exec(trimmed);
    const pyFn = /^def\s+([A-Za-z_]\w*)\s*\(/.exec(trimmed);
    const pyClass = /^class\s+([A-Za-z_]\w*)/.exec(trimmed);
    const exported = /^export\s+(?:const|let|var|type|interface)\s+([A-Za-z_$][\w$]*)/.exec(trimmed);
    if (fn) symbols.push({ file, name: fn[1], kind: 'function', line: lineNo });
    if (klass) symbols.push({ file, name: klass[1], kind: 'class', line: lineNo });
    if (pyFn && language === 'python') symbols.push({ file, name: pyFn[1], kind: 'function', line: lineNo });
    if (pyClass && language === 'python') symbols.push({ file, name: pyClass[1], kind: 'class', line: lineNo });
    if (exported) symbols.push({ file, name: exported[1], kind: 'export', line: lineNo });
  });
  return dedupeSymbols(symbols);
}

function extractJsTsImports(file: string, source: string, allFiles: Set<string>): ImportEdge[] {
  const edges: ImportEdge[] = [];
  const patterns: Array<[RegExp, ImportEdge['kind']]> = [
    [/import\s+(?:type\s+)?(?:[^'\"]+from\s+)?['\"]([^'\"]+)['\"]/g, 'static'],
    [/export\s+[^'\"]*from\s+['\"]([^'\"]+)['\"]/g, 'static'],
    [/require\(\s*['\"]([^'\"]+)['\"]\s*\)/g, 'commonjs'],
    [/import\(\s*['\"]([^'\"]+)['\"]\s*\)/g, 'dynamic']
  ];
  for (const [re, kind] of patterns) {
    for (const m of source.matchAll(re)) edges.push(edge(file, m[1], kind, allFiles));
  }
  return dedupeEdges(edges);
}

function extractPythonImports(file: string, source: string, allFiles: Set<string>): ImportEdge[] {
  const edges: ImportEdge[] = [];
  for (const line of source.split(/\r?\n/)) {
    const from = /^\s*from\s+([A-Za-z_][\w.]*|\.+[A-Za-z_][\w.]*)\s+import\s+/.exec(line);
    const imp = /^\s*import\s+([A-Za-z_][\w.]*)(?:\s+as\s+\w+)?/.exec(line);
    if (from) edges.push(edge(file, from[1], 'python', allFiles));
    if (imp) edges.push(edge(file, imp[1], 'python', allFiles));
  }
  return dedupeEdges(edges);
}

function edge(from: string, specifier: string, kind: ImportEdge['kind'], allFiles: Set<string>): ImportEdge {
  const to = resolveImport(from, specifier, allFiles);
  return { from, to: to ?? specifier, specifier, kind, resolved: Boolean(to) };
}

export function resolveImport(from: string, specifier: string, allFiles: Set<string>): string | undefined {
  if (!specifier.startsWith('.') && !specifier.startsWith('/')) {
    const py = specifier.replace(/\./g, '/');
    return firstExisting([`${py}.py`, `${py}/__init__.py`, `src/${py}.py`, `src/${py}/__init__.py`], allFiles);
  }
  const base = specifier.startsWith('/') ? specifier.slice(1) : path.posix.normalize(path.posix.join(path.posix.dirname(from), specifier));
  return firstExisting([
    base,
    `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.jsx`, `${base}.mjs`, `${base}.cjs`, `${base}.py`,
    `${base}/index.ts`, `${base}/index.tsx`, `${base}/index.js`, `${base}/__init__.py`
  ], allFiles);
}

function firstExisting(candidates: string[], allFiles: Set<string>) { return candidates.find((c) => allFiles.has(c)); }
function dedupeEdges(edges: ImportEdge[]) { return [...new Map(edges.map((e) => [`${e.from}\0${e.to}\0${e.kind}`, e])).values()]; }
function dedupeSymbols(symbols: SymbolRecord[]) { return [...new Map(symbols.map((s) => [`${s.file}\0${s.name}\0${s.kind}\0${s.line}`, s])).values()]; }
