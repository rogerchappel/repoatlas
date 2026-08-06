# MCP tools

repoatlas V1 exposes read-only stdio tools:

| Tool | Purpose |
|---|---|
| `repoatlas_search` | Search indexed paths and symbols. |
| `repoatlas_impact` | Return a JSON impact brief for a file. |
| `repoatlas_file_brief` | Return role/import/symbol facts for one file. |
| `repoatlas_context_pack` | Return a compact markdown evidence pack for a topic. |

`repoatlas_context_pack` accepts an optional `maxTokens` argument. Like the CLI
option, it must be a positive safe integer, defaults to `8000`, and budgets four
source characters per token. Invalid values return JSON-RPC `-32602` (invalid
params) instead of producing a pack.

Run with:

```bash
repoatlas mcp --stdio
```
