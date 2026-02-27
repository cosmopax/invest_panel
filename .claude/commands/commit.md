---
description: Run pre-commit checks — build, type check, security audit, then commit and push
---

Run the following checks in order. Stop and fix if any step fails:

1. `npm run build` — must pass with zero errors
2. `npx tsc --noEmit` — must pass with zero type errors
3. Use the `security-auditor` subagent to scan for secrets and vulnerabilities in changed files (check `git diff --cached --name-only`)
4. If all checks pass, show the `git diff --stat` and ask the user for a commit message
5. After commit, `git push`
6. Use the `/project-mgmt` skill to update task log and project status
