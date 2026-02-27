---
description: TypeScript and code quality standards
globs: ["src/**/*.ts", "src/**/*.tsx"]
---

# Code Quality

TypeScript strict mode. No `any` types except interfacing with untyped libraries — use `unknown` and narrow.

Every file under 300 lines. Extract when approaching this limit.

Every function under 50 lines. Extract helpers with descriptive names.

JSDoc comments on all exported functions, types, and interfaces.

Zod schemas for all API request and response validation.

When making a design decision not in the spec, add a `// DECISION:` comment explaining the choice and rationale.

Imports: prefer named exports over default exports. Group imports: external libs, then internal `@/` paths, then relative.
