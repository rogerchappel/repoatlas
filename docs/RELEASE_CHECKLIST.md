# Release checklist

This checklist supports a release decision. The checks do not publish, tag, or
deploy; pushing an approved version tag starts the publishing workflow.

1. Start from a clean branch based on the latest `main`.
2. Set the same new version in `package.json` and `package-lock.json`, and add
   the matching changelog entry. It must be greater than npm `latest`.
   `package.json` is the runtime source of truth: the CLI `--version` output and
   MCP `initialize` response both read this value rather than carrying separate
   version constants.
3. Run `npm ci` and `npm run release:check` on a supported Node.js version.
4. Run `RELEASE_TAG=vX.Y.Z npm run release:dry-run` with the candidate tag.
5. Review the `npm run package:smoke` file count and tarball allowlist result.
6. Verify the README install, CLI, library, and MCP examples against the candidate.
7. Confirm CI and the Release dry run workflow are green.
8. Push the matching `vX.Y.Z` tag only after approval. The Release workflow
   re-runs validation, packs once, publishes that tarball to npm using trusted
   publishing with provenance, and attaches the same tarball to the GitHub
   release.

The package smoke check asserts that the CLI and library entrypoints, license,
security policy, changelog, README, and this checklist are present. It also
compares the packed package version with the CLI and MCP runtime versions, and
rejects files outside the package's documented top-level allowlist.
