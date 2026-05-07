# Index format

`.repoatlas/index.json` is a deterministic JSON document with:

- `version`: schema version, currently `1`.
- `root`: absolute indexed root.
- `generatedAt`: deterministic timestamp for reproducible tests and diffs.
- `files`: role, language, byte size, imports, and symbols per file.
- `edges`: flattened import edges for graph consumers.

Import edges include the original specifier, resolved path when known, import kind, and a `resolved` flag.
