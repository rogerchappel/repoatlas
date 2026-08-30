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
  const ignoredRanges = jsTsCommentAndLiteralRanges(source);
  const patterns: Array<[RegExp, ImportEdge['kind']]> = [
    [/import\s+(?:type\s+)?(?:[^'\"]+from\s+)?['\"]([^'\"]+)['\"]/g, 'static'],
    [/export\s+[^'\"]*from\s+['\"]([^'\"]+)['\"]/g, 'static'],
    [/require\(\s*['\"]([^'\"]+)['\"]\s*\)/g, 'commonjs'],
    [/import\(\s*['\"]([^'\"]+)['\"]\s*\)/g, 'dynamic']
  ];
  for (const [re, kind] of patterns) {
    for (const m of source.matchAll(re)) {
      if (!isInRange(m.index, ignoredRanges)) edges.push(edge(file, m[1], kind, allFiles));
    }
  }
  return dedupeEdges(edges);
}

function jsTsCommentAndLiteralRanges(source: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  let i = 0;

  const scanQuoted = (quote: string) => {
    const start = i++;
    while (i < source.length) {
      if (source[i] === '\\') i += 2;
      else if (source[i++] === quote) break;
    }
    ranges.push([start, Math.min(i, source.length)]);
  };

  const scanRegex = () => {
    const start = i++;
    let inCharacterClass = false;
    while (i < source.length) {
      if (source[i] === '\\') {
        i += 2;
        continue;
      }
      if (source[i] === '[') inCharacterClass = true;
      else if (source[i] === ']') inCharacterClass = false;
      else if (source[i] === '/' && !inCharacterClass) {
        i += 1;
        while (/[A-Za-z]/.test(source[i] ?? '')) i += 1;
        break;
      } else if (source[i] === '\n' || source[i] === '\r') break;
      i += 1;
    }
    ranges.push([start, i]);
  };

  const canStartRegex = (at: number) => {
    const before = source.slice(0, at);
    const token = /([A-Za-z_$][\w$]*|\+\+|--|=>|&&|\|\||\?\?|\S)\s*$/.exec(before)?.[1];
    if (!token) return true;
    if (/^(?:return|throw|case|delete|void|typeof|instanceof|in|of|yield|await)$/.test(token)) return true;
    return /^(?:[({[=,:;!&|?+\-*%^~<>])$/.test(token);
  };

  const scanTemplate = () => {
    let rawStart = i++;
    while (i < source.length) {
      if (source[i] === '\\') {
        i += 2;
        continue;
      }
      if (source[i] === '`') {
        i += 1;
        ranges.push([rawStart, i]);
        return;
      }
      if (source[i] === '$' && source[i + 1] === '{') {
        ranges.push([rawStart, i + 2]);
        i += 2;
        scanCode(true);
        if (source[i] === '}') i += 1;
        rawStart = i - 1;
        continue;
      }
      i += 1;
    }
    ranges.push([rawStart, i]);
  };

  const scanCode = (stopAtClosingBrace = false) => {
    let braceDepth = 0;
    while (i < source.length) {
      const start = i;
      const char = source[i];
      const next = source[i + 1];
      if (stopAtClosingBrace && char === '}' && braceDepth === 0) return;
      if (char === '{') {
        braceDepth += 1;
        i += 1;
      } else if (char === '}') {
        braceDepth -= 1;
        i += 1;
      } else if (char === '/' && next === '/') {
        i += 2;
        while (i < source.length && source[i] !== '\n') i += 1;
        ranges.push([start, i]);
      } else if (char === '/' && next === '*') {
        i += 2;
        while (i < source.length && !(source[i] === '*' && source[i + 1] === '/')) i += 1;
        i = Math.min(i + 2, source.length);
        ranges.push([start, i]);
      } else if (char === "'" || char === '"') scanQuoted(char);
      else if (char === '`') scanTemplate();
      else if (char === '/' && canStartRegex(i)) scanRegex();
      else i += 1;
    }
  };

  scanCode();
  return ranges;
}

function isInRange(index: number | undefined, ranges: Array<[number, number]>): boolean {
  if (index === undefined) return false;
  return ranges.some(([start, end]) => index >= start && index < end);
}

function extractPythonImports(file: string, source: string, allFiles: Set<string>): ImportEdge[] {
  const edges: ImportEdge[] = [];
  for (const line of pythonImportStatements(source)) {
    const from = /^\s*from\s+([A-Za-z_][\w.]*|\.+(?:[A-Za-z_][\w.]*)?)\s+import\s+(.+?)\s*(?:#.*)?$/.exec(line);
    const imp = /^\s*import\s+(.+?)\s*(?:#.*)?$/.exec(line);
    if (from) {
      const names = pythonImportNames(from[2]);
      const submodules = names.map((name) => edge(file, `${from[1]}${from[1].endsWith('.') ? '' : '.'}${name}`, 'python', allFiles));
      const resolved = submodules.filter((candidate) => candidate.resolved);
      edges.push(...(resolved.length > 0 ? resolved : [edge(file, from[1], 'python', allFiles)]));
    } else if (imp) {
      for (const name of pythonImportNames(imp[1])) edges.push(edge(file, name, 'python', allFiles));
    }
  }
  return dedupeEdges(edges);
}

function pythonImportStatements(source: string): string[] {
  const statements: string[] = [];
  let multiline = '';
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trimEnd();
    if (multiline) {
      multiline += ` ${line.trim()}`;
      if (line.includes(')')) {
        statements.push(multiline);
        multiline = '';
      }
      continue;
    }
    if (/^\s*from\s+\S+\s+import\s+\(\s*$/.test(line)) {
      multiline = line;
    } else {
      statements.push(line);
    }
  }
  return statements;
}

function pythonImportNames(clause: string): string[] {
  return clause
    .replace(/^\(|\)$/g, '')
    .split(',')
    .map((part) => part.trim().replace(/\s+as\s+[A-Za-z_]\w*$/, ''))
    .filter((part) => /^[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*$/.test(part));
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
  const pythonRelative = /^(\.+)([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*)$/.exec(specifier);
  if (pythonRelative) {
    const parentSegments = Array.from({ length: pythonRelative[1].length - 1 }, () => '..');
    const moduleSegments = pythonRelative[2].split('.');
    const pyBase = path.posix.normalize(path.posix.join(path.posix.dirname(from), ...parentSegments, ...moduleSegments));
    return firstExisting([`${pyBase}.py`, `${pyBase}/__init__.py`], allFiles);
  }
  const base = specifier.startsWith('/') ? specifier.slice(1) : path.posix.normalize(path.posix.join(path.posix.dirname(from), specifier));
  return firstExisting([
    base,
    ...typescriptSourceCandidates(base),
    `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.jsx`, `${base}.mjs`, `${base}.cjs`, `${base}.py`,
    `${base}/index.ts`, `${base}/index.tsx`, `${base}/index.js`, `${base}/__init__.py`
  ], allFiles);
}

function typescriptSourceCandidates(base: string): string[] {
  const extensionMap: Record<string, string[]> = {
    '.js': ['.ts', '.tsx'],
    '.jsx': ['.tsx'],
    '.mjs': ['.mts'],
    '.cjs': ['.cts']
  };
  const extension = path.posix.extname(base);
  return (extensionMap[extension] ?? []).map((sourceExtension) => `${base.slice(0, -extension.length)}${sourceExtension}`);
}

function firstExisting(candidates: string[], allFiles: Set<string>) { return candidates.find((c) => allFiles.has(c)); }
function dedupeEdges(edges: ImportEdge[]) { return [...new Map(edges.map((e) => [`${e.from}\0${e.to}\0${e.kind}`, e])).values()]; }
function dedupeSymbols(symbols: SymbolRecord[]) { return [...new Map(symbols.map((s) => [`${s.file}\0${s.name}\0${s.kind}\0${s.line}`, s])).values()]; }
