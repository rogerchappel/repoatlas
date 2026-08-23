import { buildImpactBrief } from './impact.js';
import { buildContextPack } from './pack.js';
import { findFile } from './fileBrief.js';
import type { RepoAtlasIndex } from './types.js';
import { VERSION } from './version.js';

type JsonRpc = { id?: string | number; method?: string; params?: Record<string, unknown> };

export async function handleMcpRequest(index: RepoAtlasIndex, request: JsonRpc) {
  if (request.id === undefined) return undefined;
  if (request.method === 'initialize') return result(request.id, { protocolVersion: '2024-11-05', serverInfo: { name: 'repoatlas', version: VERSION }, capabilities: { tools: {} } });
  if (request.method === 'tools/list') return result(request.id, { tools: tools() });
  if (request.method === 'tools/call') return callTool(index, request);
  return methodNotFound(request.id, request.method);
}

export async function runMcpStdio(
  index: RepoAtlasIndex,
  input: NodeJS.ReadableStream & AsyncIterable<string | Buffer> = process.stdin,
  output: Pick<NodeJS.WritableStream, 'write'> = process.stdout,
) {
  let buffer = '';
  input.setEncoding('utf8');
  for await (const chunk of input) {
    buffer += chunk;
    let idx;
    while ((idx = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (!line) continue;
      await processFrame(index, line, output);
    }
  }
  const trailingFrame = buffer.trim();
  if (trailingFrame) await processFrame(index, trailingFrame, output);
}

async function processFrame(
  index: RepoAtlasIndex,
  frame: string,
  output: Pick<NodeJS.WritableStream, 'write'>,
) {
  let request: JsonRpc;
  try {
    request = JSON.parse(frame) as JsonRpc;
  } catch {
    output.write(`${JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } })}\n`);
    return;
  }
  const response = await handleMcpRequest(index, request);
  if (response !== undefined) output.write(`${JSON.stringify(response)}\n`);
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
  const name = request.params?.name;
  if (typeof name !== 'string') return invalidParams(request.id, 'name must be a string');
  const rawArgs = request.params?.arguments;
  if (rawArgs !== undefined && (!rawArgs || typeof rawArgs !== 'object' || Array.isArray(rawArgs))) {
    return invalidParams(request.id, 'arguments must be an object');
  }
  const args = (rawArgs ?? {}) as Record<string, unknown>;
  if (name === 'repoatlas_search') {
    const error = requiredString(args, 'query');
    return error ? invalidParams(request.id, error) : text(request.id, search(index, args.query as string));
  }
  if (name === 'repoatlas_impact' || name === 'repoatlas_file_brief') {
    const error = requiredString(args, 'target');
    if (error) return invalidParams(request.id, error);
    const value = name === 'repoatlas_impact' ? buildImpactBrief(index, args.target as string) : findFile(index, args.target as string) ?? null;
    return text(request.id, JSON.stringify(value, null, 2));
  }
  if (name === 'repoatlas_context_pack') {
    const topicError = requiredString(args, 'topic');
    if (topicError) return invalidParams(request.id, topicError);
    const maxTokens = Object.prototype.hasOwnProperty.call(args, 'maxTokens') ? args.maxTokens : 8000;
    if (typeof maxTokens !== 'number' || !Number.isSafeInteger(maxTokens) || maxTokens <= 0) {
      return invalidParams(request.id, 'maxTokens must be a positive safe integer');
    }
    return text(request.id, await buildContextPack(index, args.topic as string, maxTokens));
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
function methodNotFound(id: JsonRpc['id'], method: unknown) { return { jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${String(method ?? '')}` } }; }
function requiredString(args: Record<string, unknown>, name: string) {
  return typeof args[name] === 'string' ? undefined : `${name} must be a string`;
}
