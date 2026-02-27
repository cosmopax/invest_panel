# MERIDIAN Build Tasks

## Phase 1: Foundation [CURRENT]
- [ ] Database schema — all tables from spec Section 2
- [ ] Drizzle migrations
- [ ] Price service: Finnhub, CoinGecko, Metals.Dev, ECB
- [ ] Rate limiter (token bucket per API)
- [ ] Portfolio CRUD API routes
- [ ] Dashboard page (holdings table, performance chart, allocation donut)
- [ ] Settings page (API key management)
- [ ] Dark theme setup (navy/charcoal palette)

## Phase 2: The Wire + Sentinel
- [ ] News service (Finnhub + RSS)
- [ ] Sentinel agent (news classification, sentiment, dedup)
- [ ] Agent scheduler (node-cron)
- [ ] /wire page (filterable feed, narratives)
- [ ] Agent run history in settings

## Phase 3: The Archive + Librarian
- [ ] Knowledge library schema + 30 seed entries
- [ ] /archive page (taxonomy, FTS5, KaTeX math)
- [ ] Librarian agent (academic discovery)

## Phase 4: The Desk + Scout + Strategist
- [ ] /desk page (recommendation cards, tabs)
- [ ] Scout agent (technical indicators, opportunities)
- [ ] Strategist agent (macro synthesis, Opus model)
- [ ] Recommendation accuracy tracking

## Phase 5: The Forum + Full Orchestration
- [ ] /forum page (chat with Strategist)
- [ ] Message streaming (Claude streaming API)
- [ ] Full agent orchestration (all 4 on schedule)
- [ ] Cross-feature linking
