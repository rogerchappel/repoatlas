# Privacy model

repoatlas does not send code anywhere. Indexing and queries use local filesystem reads and write only `.repoatlas/index.json` unless shell redirection is used by the operator.

The project has no telemetry dependency, hosted service, API key requirement, or vector database requirement. MCP is stdio-only in V1, so it does not open a network port.
