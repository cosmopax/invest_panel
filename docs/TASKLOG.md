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

### [2026-02-27T03:30:00Z] Phase 2: The Wire + Sentinel
- **Phase**: 2
- **Files**: 14 files (dedup.ts, news-service.ts, claude-client.ts, base-agent.ts, sentinel.ts, scheduler.ts, api/news/route.ts, api/agents/route.ts, use-news.ts, 3 wire components, wire/page.tsx, settings/page.tsx updated)
- **Decisions**: None
- **Build**: pass
- **Status**: complete
- **Notes**: News service fetches from Finnhub (market + company news for portfolio stocks) + 6 RSS feeds (ECB, BIS, Reuters, BBC, NYT, MarketWatch). Content dedup via SHA-256 hash + cluster key. BaseAgent abstract class with full lifecycle (gather→build→call→process→persist). Sentinel agent: batch classification via Claude API (category, relevance 0-1, sentiment per asset, source quality, narrative tags). Agent scheduler via node-cron with env-configurable cron expressions and timezone (Europe/Vienna). Claude client wrapper with cost estimation. Wire page: filterable feed with category badges, sentiment pills, relevance bars, bookmarks, FTS5 search, emerging narrative clusters sidebar. Agent run history in settings with scheduler status, cumulative stats, and recent runs. ~1,900 lines added.

### [2026-02-27T03:45:00Z] Phase 3: The Archive + Librarian
- **Phase**: 3
- **Files**: 13 files (knowledge-seed.ts, knowledge-service.ts, librarian.ts, scheduler.ts updated, api/knowledge/route.ts, use-knowledge.ts, 3 archive components, archive/page.tsx, archive/[slug]/page.tsx, layout.tsx updated, react-katex.d.ts)
- **Decisions**: .gitignore `data/` → `/data/` to avoid matching `src/lib/data/`.
- **Build**: pass
- **Status**: complete
- **Notes**: 30 seed knowledge entries across 6 domains (Financial Mathematics, Behavioral Economics, Macroeconomics, Futures Studies, Game Theory, Complexity Science) with full LaTeX math, explanations, practical applications, limitations, and cross-references. Knowledge service with FTS5 search, domain taxonomy, seeding. Librarian agent discovers new entries weekly (Monday 2 AM CET). Archive page with domain sidebar taxonomy browser, knowledge cards grid, FTS5 search. Entry detail page with KaTeX math rendering (dynamic import, SSR disabled), react-markdown for explanations, related entries navigation. ~2,500 lines added.

### [2026-02-27T05:00:00Z] Phase 4: The Desk + Scout + Strategist
- **Phase**: 4
- **Files**: 9 files (technical-indicators.ts, scout.ts, strategist.ts, scheduler.ts updated, api/recommendations/route.ts, use-recommendations.ts, recommendation-card.tsx, desk-filters.tsx, desk/page.tsx)
- **Decisions**: None
- **Build**: pass
- **Status**: complete
- **Notes**: Technical indicators library (RSI, MACD, SMA/EMA, Bollinger Bands, volume trends) with summarize function for Scout prompt injection. Scout agent: fetches 200-day OHLCV from Finnhub/CoinGecko, computes all technicals per asset, reads Sentinel news context (last 48h), generates 1-5 typed recommendations per run. Strategist agent: uses Opus model for deep macro analysis, scenario planning with probabilities, regime identification, historical parallels, assumption challenging. Reads Scout recs + Sentinel digest. Inter-agent data flow via shared DB (news_items → Scout, recommendations → Strategist). Recommendations API with full filter set (type, status, agent, confidence range, horizon) + PATCH for status/outcome/accuracy. Desk page: 5 category tabs, expandable cards with confidence meters and evidence display, stats cards, filter controls, Run Scout/Strategist manual triggers. ~2,000 lines added.

### [2026-02-27T06:00:00Z] Phase 5: The Forum + Full Orchestration
- **Phase**: 5
- **Files**: 8 files (api/chat/route.ts, api/conversations/route.ts, use-forum.ts, 4 forum components, forum/page.tsx)
- **Decisions**: None
- **Build**: pass
- **Status**: complete
- **Notes**: Chat API with SSE streaming via Anthropic SDK. Four conversation types with tailored system prompts: General (Sonnet), Scenario Planning (Opus), Portfolio Review (Sonnet), Strategy Session (Opus). Auto context injection: portfolio holdings, recent news digest (top 15), active recommendations. Message persistence with token/cost tracking. Conversations API with CRUD + FTS5 search. Forum page: three-column layout (conversation list with search, chat thread with real-time streaming + abort, toggleable context sidebar showing portfolio/news/recommendations). Message bubbles with react-markdown + remark-gfm rendering, streaming indicator. All 4 agents configured in scheduler. ~1,500 lines added.

### [2026-02-27T06:00:30Z] All Phases Complete
- **Status**: complete
- **Notes**: MERIDIAN Investment Intelligence Hub fully implemented across 6 phases. 90+ source files, ~10,800 lines of code, 11 API routes, 8 pages, 4 AI agents, 21 build routes. Build passing with zero type errors. All features functional pending API key configuration.

### [2026-02-27T14:00:00Z] Multi-AI Orchestration Framework
- **Phase**: AI
- **Files**: 20 new, 11 modified (31 total)
- **Decisions**: Route Sentinel/Librarian→Gemini (fast classification), Scout→Codex (analytics), Strategist/Forum→Claude (deep reasoning). Cross-verify Scout (1 verifier) and Strategist (2 verifiers). Simulated streaming for CLI-based chat (chunk at 50 chars/15ms).
- **Build**: pass
- **Status**: complete
- **Notes**: Replaced direct Anthropic SDK usage with provider-agnostic orchestration layer. Three CLI providers (Claude Code, Gemini CLI, Codex CLI) wrapped as subprocess executors. Skills system with 9 reusable prompt templates. Subagent parallel executor via Promise.allSettled. Cross-verification protocol with consensus evaluation (unanimous/majority/no_consensus). Automatic fallback chains per task domain. Provider health endpoint (/api/ai/health) with cached checks. Forum chat migrated to simulated streaming. Provider selector added to new conversation dialog. Settings page shows provider health status with latency. Schema updated: `provider` column on agentRuns, `preferredProvider` on conversations. ~2,300 lines added.
