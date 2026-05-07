# Development notes

repoatlas favors small deterministic parsers over broad dependencies. When adding language support:

1. Add a fixture with known imports and symbols.
2. Keep parsing local and deterministic.
3. Mark unresolved edges rather than guessing.
4. Update impact brief tests with evidence paths.
