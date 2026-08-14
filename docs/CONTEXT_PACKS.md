# Context packs

Context packs are compact markdown bundles for agent prompts. repoatlas scores files by topic terms in paths and symbols, then includes bounded snippets with role/language metadata.

Use a smaller `--max-tokens` value for planning prompts and a larger one for implementation handoff.

`--max-tokens` must be a positive integer and defaults to `8000`. repoatlas
uses a deterministic estimate of four source characters per token. The limit
applies to included file blocks; the fixed pack title, topic, and root metadata
are outside that content budget. Files are considered in deterministic rank
order. If a complete file block does not fit in the remaining budget, repoatlas
skips it and considers later ranked files; it never emits a partial snippet. A
metadata-only pack is produced when none of the considered file blocks fit.
