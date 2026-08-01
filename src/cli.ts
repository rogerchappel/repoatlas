#!/usr/bin/env node
import { Command } from 'commander';
import { buildImpactBrief, formatImpactBrief } from './impact.js';
import { buildIndex, loadIndex, writeIndex } from './indexer.js';
import { buildContextPack } from './pack.js';
import { findFile, formatFileBrief } from './fileBrief.js';
import { runMcpStdio } from './mcp.js';
import { summarizeIndex } from './summary.js';
import { VERSION } from './version.js';

const program = new Command();
program.name('repoatlas').description('Local-first repository intelligence for coding agents.').version(VERSION);

program.command('index')
  .argument('[root]', 'repository root', '.')
  .option('--json', 'print the index JSON')
  .description('Build .repoatlas/index.json without network calls.')
  .action(async (root: string, opts: { json?: boolean }) => {
    const index = await buildIndex(root);
    const target = await writeIndex(index);
    if (opts.json) console.log(JSON.stringify(index, null, 2));
    else {
      const summary = summarizeIndex(index);
      console.log(`Indexed ${summary.files} files and ${summary.edges} import edges -> ${target}`);
    }
  });

program.command('impact')
  .argument('<target>', 'file path to analyze')
  .option('-r, --root <root>', 'repository root', '.')
  .option('--json', 'print JSON')
  .description('Show dependents, likely tests, docs, config, and evidence paths.')
  .action(async (target: string, opts: { root: string; json?: boolean }) => {
    const brief = buildImpactBrief(await loadIndex(opts.root), target);
    console.log(opts.json ? JSON.stringify(brief, null, 2) : formatImpactBrief(brief));
  });

program.command('file')
  .argument('<target>', 'file path to describe')
  .option('-r, --root <root>', 'repository root', '.')
  .option('--json', 'print JSON')
  .description('Show role, language, imports, and symbols for one file.')
  .action(async (target: string, opts: { root: string; json?: boolean }) => {
    const file = findFile(await loadIndex(opts.root), target);
    if (!file) throw new Error(`File not found in index: ${target}`);
    console.log(opts.json ? JSON.stringify(file, null, 2) : formatFileBrief(file));
  });

program.command('pack')
  .option('-r, --root <root>', 'repository root', '.')
  .option('--topic <topic>', 'topic to pack', 'repository overview')
  .option('--max-tokens <tokens>', 'rough token budget', (v) => Number(v), 8000)
  .description('Create a compact cited context pack for a topic.')
  .action(async (opts: { root: string; topic: string; maxTokens: number }) => {
    console.log(await buildContextPack(await loadIndex(opts.root), opts.topic, opts.maxTokens));
  });

program.command('ask')
  .argument('<query>', 'path or symbol query')
  .option('-r, --root <root>', 'repository root', '.')
  .option('--json', 'print JSON')
  .description('Search indexed paths and symbols deterministically.')
  .action(async (query: string, opts: { root: string; json?: boolean }) => {
    const index = await loadIndex(opts.root);
    const q = query.toLowerCase();
    const matches = index.files.filter((f) => f.path.toLowerCase().includes(q) || f.symbols.some((s) => s.name.toLowerCase().includes(q))).slice(0, 25);
    if (opts.json) console.log(JSON.stringify(matches, null, 2));
    else matches.forEach((f) => console.log(`${f.path} [${f.role}/${f.language}]`));
  });

program.command('mcp')
  .option('-r, --root <root>', 'repository root', '.')
  .option('--stdio', 'run MCP over newline-delimited stdio')
  .description('Run the read-only MCP tool server.')
  .action(async (opts: { root: string; stdio?: boolean }) => {
    if (!opts.stdio) throw new Error('Only --stdio transport is supported in V1.');
    await runMcpStdio(await loadIndex(opts.root));
  });

program.parseAsync().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
