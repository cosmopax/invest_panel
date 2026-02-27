# MERIDIAN — Project Status

**Last Updated**: 2026-02-27T14:00:00Z
**Current Phase**: COMPLETE — All 6 phases + Multi-AI Orchestration done
**Overall Progress**: 100% (Phase 0-5 + AI Orchestration complete)

---

## Phase Progress

| Phase | Name | Status | Progress | Started | Completed |
|-------|------|--------|----------|---------|-----------|
| 0 | Environment Setup | ✅ Complete | 100% | 2026-02-27 | 2026-02-27 |
| 1 | Foundation | ✅ Complete | 100% | 2026-02-27 | 2026-02-27 |
| 2 | The Wire + Sentinel | ✅ Complete | 100% | 2026-02-27 | 2026-02-27 |
| 3 | The Archive + Librarian | ✅ Complete | 100% | 2026-02-27 | 2026-02-27 |
| 4 | The Desk + Scout + Strategist | ✅ Complete | 100% | 2026-02-27 | 2026-02-27 |
| 5 | The Forum + Full Orchestration | ✅ Complete | 100% | 2026-02-27 | 2026-02-27 |
| AI | Multi-AI Orchestration Framework | ✅ Complete | 100% | 2026-02-27 | 2026-02-27 |

## Current Work

**Active Task**: Post-launch refinements (optional)
**Blockers**: API keys not yet configured in .env.local (blocks live pricing + agent runs, not blocking dev).
**Open Questions**: None

## Metrics

| Metric | Value |
|--------|-------|
| Files created | ~110 source files |
| Lines of code | ~13,000 (src/) |
| Build status | ✅ passing |
| Type check status | ✅ zero errors |
| Git commits | 16 |
| Last commit | 593a7f5 |
| API routes | 12 (portfolio, watchlist, prices, history, search, settings, news, agents, knowledge, recommendations, chat, conversations, ai/health) |
| Pages | 8 (dashboard, wire, desk, archive, archive/[slug], forum, settings, 404) |
| Agents | 4 (sentinel, scout, librarian, strategist) |

## What Works (Phase 1)

- **Database**: 12 tables + 3 FTS5 virtual tables with sync triggers. WAL mode. Drizzle ORM.
- **Price services**: Finnhub (stocks), CoinGecko (crypto, batch), Metals.Dev (XAU/XAG/XPT/XPD), ECB (EUR rates). All with rate limiters, retry, cache-first.
- **API routes**: Portfolio CRUD (POST/GET/PATCH/DELETE), watchlist (GET/POST/DELETE), prices (batch + history), search (multi-provider), settings (GET/PATCH).
- **Dashboard**: Stats cards (value, cost, count), holdings table (sortable), allocation donut chart (Recharts), Add Holding dialog.
- **Settings page**: API key status (configured/missing), environment info, data management buttons (placeholders).
- **Layout**: Collapsible sidebar with 6 nav items + icons, top bar with portfolio value. All routes.
- **Dark theme**: MERIDIAN palette — deep navy #0a0e1a, cards #111827, accent blue #3b82f6, gain emerald, loss red.
- **State**: Zustand for UI state, TanStack Query for server data (60s auto-refetch).

## What Works (Phase 2)

- **News service**: Finnhub market/company news + 6 RSS feeds (ECB, BIS, Reuters, BBC, NYT, MarketWatch). rss-parser with 10s timeout.
- **Content dedup**: SHA-256 hash on normalized title + content. Cluster keys for fuzzy grouping. Unique constraint prevents duplicates.
- **Sentinel agent**: BaseAgent lifecycle, Claude API batch classification (category, relevance, sentiment per asset). Configurable via env vars.
- **Agent scheduler**: node-cron with env cron expressions, timezone support, enable/disable per agent, manual trigger.
- **Wire page**: Filterable feed (category, sentiment, quality, FTS5 search), news cards with source quality badges, sentiment pills, relevance bars, bookmarks.
- **Narrative clusters**: Sidebar shows emerging topics grouped by frequency.
- **Agent run history**: Settings page shows scheduler status, cumulative stats, recent runs with duration/tokens/cost.
- **API routes**: `/api/news` (GET with filters + FTS5, PATCH read/bookmark), `/api/agents` (GET history + stats, POST manual trigger).

## What Works (Phase 3)

- **Knowledge library**: 30 seed entries across 6 domains (Financial Math, Behavioral Economics, Macro, Futures Studies, Game Theory, Complexity Science).
- **Archive page**: Taxonomy browser sidebar, knowledge cards grid, FTS5 search, entry detail with KaTeX math rendering.
- **Librarian agent**: Weekly knowledge discovery via Claude API, prioritizes underrepresented domains.
- **Cross-references**: Intra-domain related entries with bidirectional navigation.
- **API routes**: `/api/knowledge` (GET with slug/search/taxonomy/seed).

## What Works (Phase 4)

- **Technical indicators**: RSI(14), MACD(12/26/9), SMA/EMA(50/200), Bollinger Bands(20/2), volume trends.
- **Scout agent**: Fetches 200-day OHLCV data, computes technicals, reads Sentinel news context (last 48h), generates opportunity/risk/rebalance recommendations. Every 4 hours.
- **Strategist agent**: Macro synthesis via Opus model. Scenario planning, regime identification, historical parallels, assumption challenging. Reads Scout + Sentinel. Weekday mornings.
- **Desk page**: Category tabs, expandable recommendation cards with confidence meters, evidence, risk assessment, filter controls.
- **API routes**: `/api/recommendations` (GET with filters, PATCH for status/outcome).

## What Works (Phase 5)

- **Forum page**: Three-column layout — conversation list (searchable), chat thread with streaming, context sidebar (portfolio, news, recommendations).
- **Chat with Strategist**: SSE streaming via Anthropic SDK, real-time text rendering, abort support. Model selection by conversation type (Sonnet for general/review, Opus for scenarios/strategy).
- **Conversation types**: General, Scenario Planning, Portfolio Review, Strategy Session — each with tailored system prompts and context injection.
- **Context injection**: Auto-builds system prompt with current portfolio holdings, recent news digest, active recommendations. Refreshes per message.
- **Message persistence**: All messages stored in DB, token usage and cost tracked per response.
- **FTS5 search**: Full-text search across all conversation message content.
- **Full orchestration**: All 4 agents configured in scheduler (Sentinel every 15m, Scout every 4h, Librarian weekly, Strategist weekday mornings).
- **API routes**: `/api/chat` (POST with SSE streaming), `/api/conversations` (GET/POST/PATCH).

## What Works (Multi-AI Orchestration)

- **Provider layer**: Abstract CLI subprocess wrappers for Claude Code (Opus 4.6), Gemini CLI (3.1 Pro Preview), Codex CLI (GPT-5.3). Health checks with 5min cache.
- **Orchestrator**: Task routing with fallback chains (primary → fallback1 → fallback2). Cross-verification protocol for high-stakes analysis.
- **Skills system**: 9 reusable prompt templates (classify-news, analyze-technicals, generate-recommendations, macro-synthesis, scenario-planning, discover-knowledge, verify-analysis, summarize-context, chat-response).
- **Subagent executor**: Parallel task execution via Promise.allSettled with per-task timeouts.
- **Provider routing**: Sentinel→Gemini, Scout→Codex (1 verifier), Strategist→Claude (2 verifiers), Librarian→Gemini, Forum→Claude.
- **Forum chat**: Simulated streaming via SSE (CLI tools run to completion, response chunked at 50 chars/15ms). Provider selector per conversation.
- **Settings UI**: Provider health card showing status/latency for all 3 CLIs, with manual refresh.
- **Schema**: `provider` column on agentRuns, `preferredProvider` on conversations.
- **No more Anthropic SDK dependency for agents**: All 4 agents + Forum chat use Orchestrator exclusively.

## What's NOT Working Yet (Polish Items)

- **Live prices**: Dashboard shows cost basis only (no API keys configured yet). PriceService is implemented but needs keys.
- **Performance chart**: Lightweight Charts component not yet built (spec says area chart with time range).
- **Watchlist UI**: API route exists, no UI component yet.
- **CSV export/import**: Buttons exist but disabled.

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
| Anthropic | ⬜ Not configured | Legacy — replaced by CLI providers |
| Claude CLI | ✅ Available | Strategist, Forum chat |
| Gemini CLI | ✅ Available | Sentinel, Librarian |
| Codex CLI | ✅ Available | Scout |

## Next Steps (Post-Launch Polish)

1. Configure API keys in `.env.local` to enable live pricing + agent runs
2. Add performance chart (Lightweight Charts) to dashboard
3. Add watchlist UI component to dashboard
4. CSV export/import functionality
5. Future: bonds/ETFs/REITs, VPS deployment, MCP server, Tauri desktop
