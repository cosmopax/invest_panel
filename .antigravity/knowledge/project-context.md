# MERIDIAN Project Context

## Stack
- Next.js 15 App Router, React 19, TypeScript strict mode
- SQLite via better-sqlite3 + Drizzle ORM (local-first, no Docker)
- TanStack Query (server state) + Zustand (UI state)
- Tailwind CSS + shadcn/ui (dark theme, navy/charcoal palette)
- Lightweight Charts (TradingView) for financial charts, Recharts for other visualizations
- node-cron for agent scheduling (no Redis/BullMQ)
- Anthropic Claude API for AI agents (Sonnet for routine, Opus for synthesis)

## Architecture Principles
- Local-first: SQLite file database, no external services except APIs
- Cache-first pricing: check cache TTL before API calls
- EUR base currency: all prices converted via ECB daily rates
- Agent autonomy: agents run on cron schedules, persist to shared database
- Structured outputs: agents return typed JSON, not freeform text

## Key Directories
- `src/lib/db/` — Drizzle schema and database connection
- `src/lib/services/` — API clients (Finnhub, CoinGecko, Metals.Dev, ECB)
- `src/lib/agents/` — Autonomous agent implementations
- `src/lib/ai/` — Claude API wrapper and prompt templates
- `src/components/` — React components organized by feature
- `src/app/api/` — Next.js Route Handlers (REST endpoints)

## Conventions
- All API keys in `.env.local`, never hardcoded
- ISO 8601 timestamps everywhere
- JSON columns for metadata/tags (pragmatic denormalization)
- FTS5 virtual tables for full-text search
- Idempotent operations: safe to re-run
- Never delete data: use `closedAt` timestamp for soft close
