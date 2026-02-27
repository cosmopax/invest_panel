---
description: File safety and preservation rules for all operations
globs: ["**/*"]
---

# File Safety

Before modifying any existing file, create a backup:
```
cp <file> .deprecated/<file>.$(date +%Y%m%d-%H%M%S).bak
```

Never delete files. Move to `.deprecated/` with a log entry (origin, operation, timestamp).

Never overwrite `.env.local` — create `.env.example` for templates.

Never hardcode API keys, tokens, or secrets in source code.

All database mutations must be wrapped in transactions.

Destructive operations (close holding, remove watchlist item) use soft-delete via `closedAt` timestamp — never DELETE rows.
