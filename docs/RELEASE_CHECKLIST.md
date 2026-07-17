# Release checklist

This checklist supports a release decision; it does not publish, tag, or deploy.

1. Start from a clean branch based on the latest `main`.
2. Confirm the version and changelog describe the intended candidate.
3. Run `npm ci` and `npm run release:check` on a supported Node.js version.
4. Review the `npm run package:smoke` file count and tarball allowlist result.
5. Verify the README install, CLI, library, and MCP examples against the candidate.
6. Confirm CI is green before a maintainer performs any separate release action.

The package smoke check asserts that the CLI and library entrypoints, license,
security policy, changelog, README, and this checklist are present. It also
rejects files outside the package's documented top-level allowlist.
