# MERIDIAN — Task Log

Chronological log of all completed tasks.

---

### [2026-02-27T02:45:00Z] Phase 0: Environment & Repository Setup
- **Phase**: 0
- **Files**: 71 files in initial commit
- **Decisions**: None
- **Build**: pass
- **Status**: complete
- **Notes**: Created GitHub repo (cosmopax/invest_panel), scaffolded Next.js 16 with App Router/TS/Tailwind v4, installed all deps from spec Appendix A (Drizzle, better-sqlite3, TanStack Query, Zustand, Anthropic SDK, Recharts, Lightweight Charts, KaTeX, etc.), 23 shadcn/ui components, Claude Code customisations (4 agents, 5 skills, 4 rules, 2 commands), Antigravity IDE workspace config, project tracking docs.

### [2026-02-27T02:55:00Z] Phase 1.1: Database Schema
- **Phase**: 1
- **Subsection**: 1.1
- **Files**: `src/lib/db/schema.ts`, `src/lib/db/index.ts`
- **Decisions**: None
- **Build**: pass
- **Status**: complete
- **Notes**: 12 tables (assets, holdings, watchlist, price_cache, fx_rates, news_items, recommendations, knowledge_entries, conversations, messages, agent_runs, settings). 3 FTS5 virtual tables (news_fts, knowledge_fts, messages_fts) with INSERT/UPDATE/DELETE sync triggers. WAL mode, foreign keys, busy_timeout=5000. Singleton DB connection. Type exports for all tables.

### [2026-02-27T03:00:00Z] Phase 1.2: Price Service Layer
- **Phase**: 1
- **Subsection**: 1.2
- **Files**: `src/lib/services/finnhub.ts`, `coingecko.ts`, `metals-dev.ts`, `ecb-rates.ts`, `price-service.ts`, `src/lib/utils/rate-limiter.ts`
- **Decisions**: None
- **Build**: pass
- **Status**: complete
- **Notes**: Token bucket rate limiter with queue drain (100ms interval). Finnhub: 60/min, quotes/candles/profiles/news/search. CoinGecko: 30/min, batch simple/price (up to 250 IDs), markets, OHLC, chart. Metals.Dev: 5 burst / ~100/month, latest prices EUR/gram for XAU/XAG/XPT/XPD. ECB: daily XML feed, DB-cached per day, convertToEur() utility. Unified PriceService: cache-first with TTL (stock 60s, crypto 60s, metal 900s), batch by asset class, stale fallback on API failure. withRetry: 3 attempts, exponential backoff, handles 429/5xx.

### [2026-02-27T03:05:00Z] Phase 1.3: API Route Handlers
- **Phase**: 1
- **Subsection**: 1.3
- **Files**: `src/app/api/portfolio/route.ts`, `watchlist/route.ts`, `src/app/api/prices/route.ts`, `history/route.ts`, `src/app/api/settings/route.ts`, `src/app/api/search/route.ts`, `src/lib/utils/id.ts`
- **Decisions**: Watchlist delete = hard delete. API keys in .env.local only. No metal history on free tier.
- **Build**: pass
- **Status**: complete
- **Notes**: Portfolio: find-or-create asset on POST, soft-close on DELETE. Prices: batch by symbol with inArray query. History: stock via Finnhub candles, crypto via CoinGecko market_chart. Search: multi-provider (Finnhub + CoinGecko + Metals.Dev). Settings: never exposes actual key values.

### [2026-02-27T03:10:00Z] Phase 1.4: Dashboard, Settings, Layout UI
- **Phase**: 1
- **Subsection**: 1.4-1.6
- **Files**: 16 files changed (layout, page, 3 portfolio components, sidebar, topbar, providers, stores, hooks, 5 placeholder pages, globals.css)
- **Decisions**: None
- **Build**: pass
- **Status**: complete
- **Notes**: Root layout with Inter font, dark class, Providers wrapper (QueryClient + TooltipProvider). Collapsible sidebar (56→16px). Top bar with portfolio total + 24h change. Dashboard: 3 stat cards + holdings table + allocation donut (Recharts). Add Holding dialog with full form. Settings: API key status grid + env info. Placeholder pages for Wire/Desk/Archive/Forum. MERIDIAN dark theme with custom CSS variables. Zustand UI store. usePortfolio hook with 60s refetch.

### [2026-02-27T03:10:30Z] Phase 1 Tagged: v0.1.0-phase1
- **Phase**: 1
- **Status**: complete
- **Notes**: All Phase 1 deliverables met. Build passes. Types clean. 6 commits pushed. Tagged v0.1.0-phase1.
