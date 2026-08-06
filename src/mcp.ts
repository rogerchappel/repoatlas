import { buildImpactBrief } from './impact.js';
import { buildContextPack } from './pack.js';
import { findFile } from './fileBrief.js';
import type { RepoAtlasIndex } from './types.js';
import { VERSION } from './version.js';

type JsonRpc = { id?: string | number; method?: string; params?: Record<string, unknown> };

export async function handleMcpRequest(index: RepoAtlasIndex, request: JsonRpc) {
  if (request.method === 'initialize') return result(request.id, { protocolVersion: '2024-11-05', serverInfo: { name: 'repoatlas', version: VERSION }, capabilities: { tools: {} } });
  if (request.method === 'tools/list') return result(request.id, { tools: tools() });
  if (request.method === 'tools/call') return callTool(index, request);
  return result(request.id, {});
}

export async function runMcpStdio(index: RepoAtlasIndex, input = process.stdin, output = process.stdout) {
  let buffer = '';
  input.setEncoding('utf8');
  for await (const chunk of input) {
    buffer += chunk;
    let idx;
    while ((idx = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (!line) continue;
      const req = JSON.parse(line) as JsonRpc;
      output.write(`${JSON.stringify(await handleMcpRequest(index, req))}\n`);
    }
  }
}

function tools() {
  return [
    { name: 'repoatlas_search', description: 'Search indexed paths and symbols.', inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } },
    { name: 'repoatlas_impact', description: 'Build an impact brief for a file.', inputSchema: { type: 'object', properties: { target: { type: 'string' } }, required: ['target'] } },
    { name: 'repoatlas_file_brief', description: 'Return role/import/symbol details for a file.', inputSchema: { type: 'object', properties: { target: { type: 'string' } }, required: ['target'] } },
    { name: 'repoatlas_context_pack', description: 'Return a compact evidence pack for a topic.', inputSchema: { type: 'object', properties: { topic: { type: 'string' }, maxTokens: { type: 'integer', minimum: 1, maximum: Number.MAX_SAFE_INTEGER } }, required: ['topic'] } }
  ];
}

async function callTool(index: RepoAtlasIndex, request: JsonRpc) {
  const name = String(request.params?.name ?? '');
  const args = (request.params?.arguments ?? {}) as Record<string, unknown>;
  if (name === 'repoatlas_search') return text(request.id, search(index, String(args.query ?? '')));
  if (name === 'repoatlas_impact') return text(request.id, JSON.stringify(buildImpactBrief(index, String(args.target ?? '')), null, 2));
  if (name === 'repoatlas_file_brief') return text(request.id, JSON.stringify(findFile(index, String(args.target ?? '')) ?? null, null, 2));
  if (name === 'repoatlas_context_pack') {
    const maxTokens = Object.prototype.hasOwnProperty.call(args, 'maxTokens') ? args.maxTokens : 8000;
    if (typeof maxTokens !== 'number' || !Number.isSafeInteger(maxTokens) || maxTokens <= 0) {
      return invalidParams(request.id, 'maxTokens must be a positive safe integer');
    }
    return text(request.id, await buildContextPack(index, String(args.topic ?? ''), maxTokens));
  }
  return { jsonrpc: '2.0', id: request.id, error: { code: -32601, message: `Unknown tool: ${name}` } };
}

function search(index: RepoAtlasIndex, query: string) {
  const q = query.toLowerCase();
  return JSON.stringify(index.files.filter((f) => f.path.toLowerCase().includes(q) || f.symbols.some((s) => s.name.toLowerCase().includes(q))).slice(0, 25), null, 2);
}
function text(id: JsonRpc['id'], value: string) { return result(id, { content: [{ type: 'text', text: value }] }); }
function result(id: JsonRpc['id'], value: unknown) { return { jsonrpc: '2.0', id, result: value }; }
function invalidParams(id: JsonRpc['id'], message: string) { return { jsonrpc: '2.0', id, error: { code: -32602, message: `Invalid params: ${message}` } }; }
