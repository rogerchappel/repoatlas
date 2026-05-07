# Basic workflow

```bash
repoatlas index .
repoatlas ask auth
repoatlas impact src/auth/session.ts
repoatlas pack --topic "auth session refresh" --max-tokens 4000
```

Use the output as planning evidence before editing files.
