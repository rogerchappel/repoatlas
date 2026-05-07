# repoatlas Orchestration

repoatlas is intentionally local-first and agent-workflow-first. The default workflow is:

1. Run `repoatlas index .` before an agent starts work.
2. Use `repoatlas impact <file>` during planning and review to find blast radius and likely tests.
3. Use `repoatlas pack --topic "..."` to hand a compact evidence pack to an LLM without uploading the full repository.
4. Optionally run `repoatlas mcp --stdio` so MCP hosts can call the same read-only tools.

## Ownership boundaries

- repoatlas reads the local filesystem and writes only `.repoatlas/index.json` during indexing.
- It does not edit project source files.
- It does not call external APIs or start network listeners in default commands.
- MCP V1 is stdio-only and read-only.

## Review gates

Every release should pass:

```bash
npm run check
npm test
npm run build
npm run smoke
bash scripts/validate.sh
```

## Agent usage pattern

Ask repoatlas for evidence before editing:

```bash
repoatlas impact src/routes/social.ts
repoatlas file src/routes/social.ts
repoatlas pack --topic "social publishing flow" --max-tokens 8000
```

Then cite the evidence paths in plans and reviews.
