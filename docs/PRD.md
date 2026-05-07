# PRD: repoatlas

Status: in-progress
Decision: selected for OSS factory build on 2026-05-07

## Scorecard

Total: 82/100
Band: build now
Last scored: 2026-05-03
Scored by: Neo

| Criterion | Points | Notes |
|---|---:|---|
| Problem pain | 18/20 | Agents waste large amounts of context rediscovering repository structure, symbols, dependency edges, and architectural intent. |
| Demand signal | 17/20 | Strong adjacent signal from SocratiCode and the broader MCP/codebase-intelligence category. |
| V1 buildability | 16/20 | A useful local-first V1 can start with deterministic indexing, ripgrep/tree-sitter metadata, and a small MCP/CLI surface before deep semantic search. |
| Differentiation | 12/15 | Differentiate by being agent-workflow-first: compact evidence packs, change-impact briefs, and review-ready artifacts rather than a giant general code search product. |
| Agentic workflow leverage | 15/15 | Directly improves agent onboarding, planning, impact analysis, and review quality. |
| Distribution potential | 4/10 | Crowded category, but clear developer/agent audience if scoped tightly. |

## Pitch

Local-first codebase intelligence for agents: generate searchable repository maps, symbol/dependency edges, and change-impact briefs that MCP hosts and CLI agents can consume without sending code to a cloud service.

## Why It Matters

AI coding agents are still bad at understanding medium-to-large repositories cheaply. They over-read files, miss dependency edges, and burn context on repeated exploration. `repoatlas` would precompute the boring structural knowledge once, then expose small, evidence-backed answers to agents before they edit.

This is adjacent to Roger's existing `repoctx`, but deeper and more interactive: `repoctx` makes compact context packs; `repoatlas` would maintain a local index and answer repository-intelligence questions.

## Qualification

### Pub Test

Can this be explained clearly in one sentence? Yes: “A local codebase map and impact-analysis server for coding agents.”

### Competitors / Adjacent Tools

- `giancarloerra/SocratiCode` — strong adjacent signal for local/private MCP codebase intelligence, hybrid search, dependency graphs, and impact analysis.
- Sourcegraph / Cody — mature code search and assistant context, but heavier and more cloud/product oriented.
- Cursor / Claude Code / Codex built-in search — useful but often re-discovers structure per session and lacks a persistent repo-owned knowledge index.
- `repoctx` — Roger's existing compact context generator; adjacent and potentially complementary, not a replacement.

### Star / Demand Signal

- Developers are actively building MCP/codebase-intelligence tools because agents need better repo understanding.
- Large-repo agent workflows repeatedly need: “what calls this?”, “what files are in the blast radius?”, “what tests should run?”, “what docs/API schemas are relevant?”, and “summarize this subsystem before editing.”
- Roger's own OSS factory and ClutchCut/CrewCMD work hit this need constantly.

### Real Problem

Roger and agents repeatedly spend tool calls exploring repo layout, tracing symbols manually, and rebuilding context between sessions. A local index would reduce repeated context burn and make agent planning/reviews more reliable.

### V1 Buildability

A tight V1 can avoid ambitious semantic search and still be useful:

- build a deterministic repo manifest
- detect languages, packages, entrypoints, tests, docs, and config files
- use Tree-sitter or lightweight parsers for symbol inventory where available
- build import/dependency edges for JS/TS/Python first
- expose CLI commands and a minimal MCP server
- output markdown/JSON impact briefs with source file citations

## V1 Scope

- Local CLI: `repoatlas index`, `repoatlas ask`, `repoatlas impact`, `repoatlas pack`.
- Local `.repoatlas/` index with no hidden network calls.
- JS/TS/Python import graph support.
- Symbol inventory for functions/classes/exports where parsers are available.
- File role classifier: source, test, docs, config, routes, db/schema, CI, infra.
- Impact brief for a changed file or symbol:
  - likely dependents
  - likely tests
  - relevant docs/configs
  - confidence and evidence paths
- MCP server exposing read-only tools:
  - `repoatlas_search`
  - `repoatlas_impact`
  - `repoatlas_file_brief`
  - `repoatlas_context_pack`
- Deterministic output first; optional LLM summaries are out of V1.

## Out of Scope

- Cloud sync or hosted team index.
- Editing files.
- Automatic refactors.
- Vector database requirement in V1.
- Claims about enterprise-scale performance before benchmarks exist.
- Copying SocratiCode implementation, branding, README, benchmarks, or architecture details.

## CLI/API Sketch

```bash
repoatlas index .
repoatlas impact src/routes/social.ts
repoatlas file src/clutchcut/db.py --json
repoatlas pack --topic "social publishing flow" --max-tokens 8000
repoatlas mcp --stdio
```

Example output:

```text
Impact brief: src/routes/social.ts

Likely dependents:
- src/app.ts imports route registration
- tests/social.routes.test.ts covers publish queue behavior

Related concepts:
- database queue writes
- provider credential handling
- publish audit log

Suggested verification:
- npm test -- social
- npm run typecheck
```

## Verification

- Fixture repo with JS/TS/Python files and known dependency edges.
- Snapshot tests for index output.
- Unit tests for import graph extraction.
- CLI smoke tests for `index`, `impact`, `pack`, and MCP startup.
- Privacy test: assert no network calls during indexing or queries.
- Golden output tests for compact context packs.

## Agent Prompt

Build `repoatlas`, a local-first repository intelligence CLI and MCP server for coding agents. Start with deterministic indexing and JS/TS/Python dependency mapping. Do not call external APIs. Store the index in `.repoatlas/`. Implement `index`, `impact`, `file`, `pack`, and `mcp --stdio`. Include fixture repos and tests proving impact briefs cite real files and suggest likely tests.
