# MERIDIAN — Project Status

**Last Updated**: 2026-02-27T03:10:00Z
**Current Phase**: 2 — The Wire + Sentinel (next)
**Overall Progress**: 33% (Phase 0 + Phase 1 complete)

---

## Phase Progress

| Phase | Name | Status | Progress | Started | Completed |
|-------|------|--------|----------|---------|-----------|
| 0 | Environment Setup | ✅ Complete | 100% | 2026-02-27 | 2026-02-27 |
| 1 | Foundation | ✅ Complete | 100% | 2026-02-27 | 2026-02-27 |
| 2 | The Wire + Sentinel | ⬜ Not Started | 0% | — | — |
| 3 | The Archive + Librarian | ⬜ Not Started | 0% | — | — |
| 4 | The Desk + Scout + Strategist | ⬜ Not Started | 0% | — | — |
| 5 | The Forum + Full Orchestration | ⬜ Not Started | 0% | — | — |

## Current Work

**Active Task**: Phase 2 — The Wire + Sentinel agent
**Blockers**: None. API keys not yet configured in .env.local (not blocking dev).
**Open Questions**: None

## Metrics

| Metric | Value |
|--------|-------|
| Files created | ~40 source files |
| Lines of code | ~3,200 (src/) |
| Build status | ✅ passing |
| Type check status | ✅ zero errors |
| Git commits | 6 |
| Last commit | b1934ad |
| Git tag | v0.1.0-phase1 |
| DB size | 217KB (schema + FTS5 tables) |

## What Works (Phase 1)

- **Database**: 12 tables + 3 FTS5 virtual tables with sync triggers. WAL mode. Drizzle ORM.
- **Price services**: Finnhub (stocks), CoinGecko (crypto, batch), Metals.Dev (XAU/XAG/XPT/XPD), ECB (EUR rates). All with rate limiters, retry, cache-first.
- **API routes**: Portfolio CRUD (POST/GET/PATCH/DELETE), watchlist (GET/POST/DELETE), prices (batch + history), search (multi-provider), settings (GET/PATCH).
- **Dashboard**: Stats cards (value, cost, count), holdings table (sortable), allocation donut chart (Recharts), Add Holding dialog.
- **Settings page**: API key status (configured/missing), environment info, data management buttons (placeholders).
- **Layout**: Collapsible sidebar with 6 nav items + icons, top bar with portfolio value. All routes.
- **Dark theme**: MERIDIAN palette — deep navy #0a0e1a, cards #111827, accent blue #3b82f6, gain emerald, loss red.
- **State**: Zustand for UI state, TanStack Query for server data (60s auto-refetch).

## What's NOT Working Yet

- **Live prices**: Dashboard shows cost basis only (no API keys configured yet). PriceService is implemented but needs keys.
- **Performance chart**: Lightweight Charts component not yet built (spec says area chart with time range).
- **Watchlist UI**: API route exists, no UI component yet.
- **CSV export/import**: Buttons exist but disabled.
- **Agent system**: All Phase 2+ work.

## Deviations from Spec

1. **Next.js 16 instead of 15**: `create-next-app@latest` installed Next.js 16.1.6. All patterns still match spec (App Router, Route Handlers, etc.).
2. **Sonner instead of Toast**: shadcn/ui deprecated the `toast` component, replaced with `sonner`.
3. **Watchlist delete is hard delete**: Spec says soft-delete for everything, but watchlist items have no financial history. Documented with `// DECISION:` comment.
4. **Settings in .env.local only**: API keys live in .env.local, not in the DB settings table. The settings table stores user preferences. Documented with `// DECISION:` comment.

## Decisions Log

1. `src/app/api/portfolio/watchlist/route.ts:103` — Watchlist removal is true delete (not soft-delete), since items have no financial history to preserve.
2. `src/app/api/settings/route.ts:30` — API keys live in .env.local only, never in DB. Settings table for user preferences.
3. `src/app/api/prices/history/route.ts:72` — No historical data for metals on free tier (Metals.Dev limitation).

## API Key Status

| API | Status | Notes |
|-----|--------|-------|
| Finnhub | ⬜ Not configured | Needed for stock prices |
| CoinGecko | ⬜ Not configured | Needed for crypto prices |
| Metals.Dev | ⬜ Not configured | Needed for metal prices |
| GoldAPI | ⬜ Not configured | Fallback for metals |
| Anthropic | ⬜ Not configured | Needed for Phase 2+ agents |

## Next Steps

1. Begin Phase 2: news service, Sentinel agent, /wire page
2. User should configure API keys in `.env.local` to enable live pricing
3. Add performance chart (Lightweight Charts) to dashboard
4. Add watchlist UI component to dashboard
