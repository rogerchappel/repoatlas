# repoatlas Tasks

## V1 delivery checklist

- [x] Scaffold OSS CLI baseline with StackForge.
- [x] Copy PRD into `docs/PRD.md`.
- [x] Add deterministic repository walker that ignores generated/vendor folders.
- [x] Classify files as source, test, docs, config, CI, infra, schema, route, asset, or unknown.
- [x] Extract JS/TS static, dynamic, CommonJS, and re-export import edges.
- [x] Extract Python `import` and `from ... import` edges.
- [x] Extract lightweight function/class/export symbol inventories.
- [x] Write `.repoatlas/index.json` locally with deterministic timestamps.
- [x] Implement `repoatlas index`, `impact`, `file`, `pack`, `ask`, and `mcp --stdio`.
- [x] Add read-only MCP tools for search, impact, file briefs, and context packs.
- [x] Add mixed JS/TS/Python fixture repo.
- [x] Add fixture-backed unit tests and CLI/MCP smoke tests.
- [x] Document privacy, safety, examples, and contribution flow.
- [x] Add validation script and release metadata.

## Follow-up candidates

- [ ] Add optional tree-sitter symbol providers behind explicit local dependencies.
- [ ] Add benchmark fixtures for larger repositories.
- [ ] Add richer route/framework classifiers for Next.js, Express, FastAPI, Django, and Rails.
- [ ] Add SARIF-like JSON output for review bots.
- [ ] Add watch mode that updates the index incrementally.
