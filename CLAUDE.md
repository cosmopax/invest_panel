# MERIDIAN — Investment Intelligence Hub

Personal investment research platform with autonomous Claude AI agents. Next.js 15 App Router, React 19, TypeScript strict, SQLite + Drizzle ORM, Tailwind CSS + shadcn/ui dark theme.

## Architecture

Local-first single-user app at localhost:3000. SQLite database at `data/meridian.db` (WAL mode). Four autonomous agents (Sentinel, Scout, Librarian, Strategist) run on node-cron schedules, persist to shared DB. All prices converted to EUR via ECB daily rates. Cache-first pricing with configurable TTL.

Read `docs/MERIDIAN-Technical-Specification-v1.md` for the full spec — it is the single source of truth for all implementation decisions.

## Commands

- Build: `npm run build`
- Dev: `npm run dev`
- Type check: `npx tsc --noEmit`
- DB push: `npx drizzle-kit push`
- DB studio: `npx drizzle-kit studio`
- Lint: `npm run lint`

## Key Directories

- `src/lib/db/` — Drizzle schema, connection, migrations
- `src/lib/services/` — API clients (Finnhub, CoinGecko, Metals.Dev, ECB)
- `src/lib/agents/` — Autonomous agent implementations
- `src/lib/ai/` — Claude API wrapper and prompt templates
- `src/app/api/` — Next.js Route Handlers
- `src/components/` — React components by feature domain
- `docs/` — Spec, roadmap, task log, project status

## Critical Rules

- NEVER delete files. Move to `.deprecated/` with timestamp log.
- NEVER overwrite `.env.local`. Only create `.env.example`.
- NEVER hardcode API keys or secrets.
- All DB mutations in transactions. Soft-delete via `closedAt` timestamp.
- `npm run build` must pass after every change set.
- Git commit + push after each logical unit of work.

## Project Tracking

Update these after every completed task:
- `docs/TASKLOG.md` — append completed task with timestamp
- `docs/PROJECT-STATUS.md` — update current phase, blockers, metrics
- `docs/ROADMAP.md` — check off completed milestones

## Subagents Available

Use subagents for isolated tasks to save main context:
- `architect` — PROACTIVELY review architecture decisions, schema changes, service design
- `security-auditor` — PROACTIVELY audit for secrets, injection, auth flaws before commits
- `researcher` — Delegate documentation lookups, API exploration, best-practice research
- `ui-reviewer` — Review component structure, accessibility, theme compliance

## Skills Available

- `/drizzle-sqlite` — Drizzle ORM + SQLite patterns, FTS5, WAL, migrations
- `/api-integration` — Rate-limited API client patterns with cache-first, retry, EUR conversion
- `/agent-system` — Claude API agent implementation with structured outputs
- `/project-mgmt` — Update roadmap, task log, status docs
- `/nextjs-app-router` — Next.js 15 App Router patterns, Route Handlers, layouts
