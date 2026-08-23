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

The stdio transport accepts one JSON-RPC message per line. Requests for unknown
methods return `-32601` (method not found). Tool calls with missing or
wrong-typed required arguments return `-32602` (invalid params) and do not run
the tool. Notifications (messages without an `id`) are accepted without writing
a response, as required by JSON-RPC.

Run with:

```bash
repoatlas mcp --stdio
```

The stdio transport uses newline-delimited JSON-RPC: send one complete JSON
request or notification per line. Malformed frames receive a JSON-RPC parse
error, and the server continues reading later frames. A final complete request
is also processed when stdin closes without a trailing newline. Notifications
remain silent.
