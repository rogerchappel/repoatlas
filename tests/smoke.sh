#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
cp -R "$ROOT/tests/fixtures/mixed-repo/." "$TMP/fixture"
node "$ROOT/dist/src/cli.js" index "$TMP/fixture" >/tmp/repoatlas-index.out
node "$ROOT/dist/src/cli.js" impact src/routes/social.ts --root "$TMP/fixture" | grep -q 'tests/social.routes.test.ts'
node "$ROOT/dist/src/cli.js" file src/routes/social.ts --root "$TMP/fixture" | grep -q 'registerSocialRoutes'
node "$ROOT/dist/src/cli.js" pack --root "$TMP/fixture" --topic 'social publishing' --max-tokens 1200 | grep -q 'repoatlas context pack'
printf '{"jsonrpc":"2.0","id":1,"method":"tools/list"}\n' | node "$ROOT/dist/src/cli.js" mcp --root "$TMP/fixture" --stdio | grep -q 'repoatlas_context_pack'
echo 'repoatlas smoke ok'
