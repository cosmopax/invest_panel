---
description: Git commit and push discipline
globs: ["**/*"]
---

# Git Discipline

Commit after each logical unit of work. Push after each commit.

Commit message format:
- `feat(scope):` new features
- `fix(scope):` bug fixes
- `chore(scope):` config, tooling, dependencies
- `refactor(scope):` restructuring without behavior change
- `docs(scope):` documentation updates

Scopes: db, services, agents, api, ui, config, docs

After completing a build phase, tag: `git tag v0.X.0-phaseN -m "Phase N: description"` and push tags.

Always verify `npm run build` passes before committing. Never commit with build errors.
