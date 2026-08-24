# repoatlas 🗺️

**Local-first codebase intelligence for coding agents.** repoatlas precomputes the boring repository facts agents keep rediscovering: file roles, import edges, symbols, likely tests, and compact context packs. It is deliberately deterministic, evidence-backed, and private by default.

```bash
npm install -g repoatlas
repoatlas index .
repoatlas impact src/routes/social.ts
repoatlas pack --topic "social publishing flow" --max-tokens 8000
repoatlas mcp --stdio
```

## Why repoatlas exists

Agents are good at editing after they understand the terrain. They are less good at repeatedly rebuilding the map. repoatlas gives them a small, repo-owned atlas before they touch code:

- **Repository manifest** with roles for source, tests, docs, config, CI, routes, schema, infra, and assets.
- **JS/TS/Python import graph** from deterministic parsing; no LLM required. Python extraction supports single and comma-separated `import` statements, aliases, relative `from . import module` statements, and available submodules named by `from package import module`. NodeNext-style relative `.js`, `.jsx`, `.mjs`, and `.cjs` specifiers resolve to their TypeScript source counterparts when the referenced JavaScript file is not present.
- **Symbol inventory** for common functions, classes, and exports.
- **Impact briefs** that cite dependents, likely tests, docs, config, and evidence paths.
- **Context packs** that fit agent prompts without dumping the whole repo.
- **Read-only MCP tools** for hosts that prefer tool calls over shell commands.

## Commands

### `repoatlas index [root]`

Builds `.repoatlas/index.json` in the target repository.

```bash
repoatlas index .
repoatlas index . --json
```

### `repoatlas impact <file>`

Shows blast radius, likely tests, related docs/config, confidence, and evidence paths.

```bash
repoatlas impact src/routes/social.ts
repoatlas impact src/routes/social.ts --json
```

### `repoatlas file <file>`

Explains a file's role, language, imports, and detected symbols.

```bash
repoatlas file src/routes/social.ts
```

### `repoatlas pack --topic "..."`

Creates a compact markdown evidence pack for agents.

```bash
repoatlas pack --topic "database queue writes" --max-tokens 4000
```

`--max-tokens` accepts positive integers only and defaults to `8000`. The
deterministic rough limit budgets four source characters per token; fixed pack
metadata is emitted separately from that content budget.

### `repoatlas ask <query>`

Searches indexed paths and symbols deterministically.

```bash
repoatlas ask registerSocialRoutes
```

### `repoatlas mcp --stdio`

Starts a read-only stdio MCP server with these tools:

- `repoatlas_search`
- `repoatlas_impact`
- `repoatlas_file_brief`
- `repoatlas_context_pack`

## Privacy and safety

repoatlas is local-first:

- No network calls in indexing or query commands.
- No hidden telemetry.
- No source upload.
- Default write is limited to `.repoatlas/index.json`.
- Common local secret files such as `.env`, `.npmrc`, private keys, `node_modules`, build output, and `.git` are skipped during indexing.
- MCP V1 is read-only and stdio-only.

## Development

```bash
npm install
npm run check
npm test
npm run build
npm run smoke
npm run release:check
bash scripts/validate.sh
```

Repoatlas supports Node.js 20 and later. CI verifies clean, reproducible
`npm ci` installs and the full release checks at the Node 20/npm 10 and Node
24/npm 11 runtime endpoints.

`release:check` runs the typecheck, tests, build, smoke fixture, package
assertions, and release-contract tests. It also requires the candidate version
to be greater than the current npm `latest` version. `release:dry-run` verifies
that the packed artifact version agrees with a `RELEASE_TAG` when one is
provided. The version in `package.json` is the single source for the packaged
CLI `--version` output and MCP `initialize` server information; package smoke
checks both surfaces. Maintainers can use the
[release checklist](docs/RELEASE_CHECKLIST.md) to review a candidate without
publishing or tagging it.

## Status

V1 focuses on useful deterministic structure for JS/TS/Python repositories. It intentionally avoids semantic search, hosted sync, and automatic refactors until local evidence quality is strong.
