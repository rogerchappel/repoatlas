export type FileRole = 'source' | 'test' | 'docs' | 'config' | 'ci' | 'infra' | 'schema' | 'route' | 'asset' | 'unknown';
export type Language = 'javascript' | 'typescript' | 'python' | 'json' | 'markdown' | 'yaml' | 'shell' | 'other';

export type ImportEdge = {
  from: string;
  to: string;
  specifier: string;
  kind: 'static' | 'dynamic' | 'commonjs' | 'python';
  resolved: boolean;
};

export type SymbolRecord = {
  file: string;
  name: string;
  kind: 'function' | 'class' | 'export' | 'method';
  line: number;
};

export type FileRecord = {
  path: string;
  role: FileRole;
  language: Language;
  bytes: number;
  imports: ImportEdge[];
  symbols: SymbolRecord[];
};

export type RepoAtlasIndex = {
  version: 1;
  root: string;
  generatedAt: string;
  files: FileRecord[];
  edges: ImportEdge[];
};

export type ImpactBrief = {
  target: string;
  targetFile?: FileRecord;
  dependents: string[];
  dependencies: string[];
  likelyTests: string[];
  relevantDocs: string[];
  relevantConfig: string[];
  confidence: 'low' | 'medium' | 'high';
  evidence: string[];
};
