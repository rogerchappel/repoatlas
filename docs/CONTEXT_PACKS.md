# Context packs

Context packs are compact markdown bundles for agent prompts. repoatlas scores files by topic terms in paths and symbols, then includes bounded snippets with role/language metadata.

Use a smaller `--max-tokens` value for planning prompts and a larger one for implementation handoff.

`--max-tokens` must be a positive integer and defaults to `8000`. repoatlas
uses a deterministic estimate of four source characters per token. The limit
applies to included file blocks; the fixed pack title, topic, and root metadata
are outside that content budget. A budget too small for the next complete file
block produces a metadata-only pack rather than a partial snippet.
