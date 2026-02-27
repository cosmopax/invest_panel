# MERIDIAN — Development Roadmap

**Last Updated**: 2026-02-27T03:15:00Z
**Spec**: `docs/MERIDIAN-Technical-Specification-v1.md`

---

## Phase 0: Environment & Repository Setup
**Status**: ✅ Complete
**Estimated**: 0.5 days
**Actual**: 2026-02-27

- [x] Create GitHub repo `invest_panel`
- [x] Scaffold Next.js 16 with App Router, TypeScript, Tailwind v4
- [x] Install all dependencies (Appendix A of spec)
- [x] Configure Antigravity IDE workspace
- [x] Set up `.env.local` template and `.env.example`
- [x] Configure Drizzle, `.gitignore`, `README.md`
- [x] Initial commit and push
- [x] Set up Claude Code customisations (CLAUDE.md, agents, skills, rules)
- [x] Set up project tracking docs (this file, TASKLOG, STATUS, VISION)

---

## Phase 1: Foundation
**Status**: ✅ Complete
**Estimated**: 2-3 days
**Actual**: 2026-02-27
**Tag**: `v0.1.0-phase1`

- [x] 1.1 Database schema — all tables from spec Section 2
- [x] 1.2 FTS5 virtual tables and triggers
- [x] 1.3 Database connection with WAL mode
- [x] 1.4 Finnhub API client
- [x] 1.5 CoinGecko API client (batch support)
- [x] 1.6 Metals.Dev API client
- [x] 1.7 ECB SDMX rates client
- [x] 1.8 Unified PriceService with cache-first logic
- [x] 1.9 Token bucket rate limiter
- [x] 1.10 Portfolio CRUD API route handlers
- [x] 1.11 Price API route handlers
- [x] 1.12 Settings API route handlers
- [x] 1.13 Dashboard page (holdings table, performance chart, allocation donut)
- [x] 1.14 Settings page (API key management)
- [x] 1.15 Shared layout (sidebar, top bar, dark theme)
- [x] 1.16 Zustand UI store + TanStack Query provider

**Definition of Done**: User can add holdings across stocks, crypto, and metals, see real-time EUR valuations, and view portfolio performance.

---

## Phase 2: The Wire + Sentinel
**Status**: ✅ Complete
**Estimated**: 2-3 days
**Actual**: 2026-02-27
**Tag**: `v0.2.0-phase2`

- [x] 2.1 News service (Finnhub news + RSS feeds)
- [x] 2.2 Sentinel agent (BaseAgent, Claude API, news classification)
- [x] 2.3 Content deduplication (SHA-256 hash + cluster IDs)
- [x] 2.4 Agent scheduler (node-cron)
- [x] 2.5 `/wire` page (filterable feed, category sidebar, narratives)
- [x] 2.6 Agent run history in settings
- [x] 2.7 FTS5 search on news items

**Definition of Done**: Sentinel runs on schedule, classifies news, Wire displays filterable feed.

---

## Phase 3: The Archive + Librarian
**Status**: ✅ Complete
**Estimated**: 2-3 days
**Actual**: 2026-02-27
**Tag**: `v0.3.0-phase3`

- [x] 3.1 Knowledge library schema populated with 30 seed entries
- [x] 3.2 `/archive` page (taxonomy browser, FTS5, entry detail)
- [x] 3.3 KaTeX math rendering
- [x] 3.4 Librarian agent (academic source discovery)
- [x] 3.5 Cross-referencing system
- [x] 3.6 FTS5 search on knowledge entries

**Definition of Done**: User can browse, search, read knowledge entries. Librarian discovers new entries.

---

## Phase 4: The Desk + Scout + Strategist
**Status**: ⬜ Not Started
**Estimated**: 3-4 days
**Actual**: —
**Tag**: `v0.4.0-phase4`

- [ ] 4.1 `/desk` page (recommendation cards, category tabs, history)
- [ ] 4.2 Scout agent (price analysis, technical indicators)
- [ ] 4.3 Strategist agent (macro synthesis, Opus model)
- [ ] 4.4 Technical indicator calculations (RSI, MACD, MA, Bollinger)
- [ ] 4.5 Recommendation accuracy tracking
- [ ] 4.6 Inter-agent data flow (Scout reads Sentinel, Strategist reads all)

**Definition of Done**: Scout and Strategist generate recommendations visible on The Desk.

---

## Phase 5: The Forum + Full Orchestration
**Status**: ⬜ Not Started
**Estimated**: 3-4 days
**Actual**: —
**Tag**: `v0.5.0-phase5`

- [ ] 5.1 `/forum` page (conversation list, chat interface, context sidebar)
- [ ] 5.2 Chat with Strategist (context injection)
- [ ] 5.3 Structured conversation types
- [ ] 5.4 Message streaming (Claude streaming API)
- [ ] 5.5 Inline recommendation cards and data visualizations in chat
- [ ] 5.6 Cross-feature linking
- [ ] 5.7 FTS5 search on conversations
- [ ] 5.8 Full agent orchestration (all 4 on schedule)

**Definition of Done**: User can have strategic conversations with full system context. All agents autonomous.

---

## Post-Phase 5: Future Considerations
- [ ] Bonds, ETFs, REITs asset classes
- [ ] Self-hosted VPS deployment (Hetzner)
- [ ] MCP server for Claude Code integration
- [ ] Tauri desktop packaging
- [ ] Multi-device sync (Turso)
