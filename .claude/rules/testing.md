---
description: Build verification and testing checkpoints
globs: ["src/**/*"]
---

# Testing Checkpoints

After implementing each subsection:
1. `npm run build` must succeed with zero errors
2. `npm run dev` must start without crashes
3. `npx tsc --noEmit` must pass with zero type errors

Fix build failures before moving to the next subsection. Do not accumulate tech debt across subsections.

For API route handlers: verify with `curl` that GET/POST/PATCH/DELETE return expected responses.

For UI pages: verify the dev server renders the page at the expected route without React errors in console.
