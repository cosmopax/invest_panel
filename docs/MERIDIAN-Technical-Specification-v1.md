# Investment Intelligence Hub — Technical Specification

**Codename: MERIDIAN**
**Version: 1.0 — February 2026**
**Target: Solo developer, local-first, macOS M1 Max 64GB**
**Stack: TypeScript · React 19 · Next.js 15 (App Router) · Tailwind CSS · shadcn/ui**

---

## 1. Architecture Overview

### 1.1 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js 15 App Router                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │Portfolio  │ │The Wire  │ │The Desk  │ │The Forum │       │
│  │Dashboard │ │(Newsfeed)│ │(Recs)    │ │(Chat)    │       │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘       │
│       │             │            │             │             │
│  ┌────┴─────────────┴────────────┴─────────────┴──────┐     │
│  │              TanStack Query + Zustand               │     │
│  │         (Server state + Client state)               │     │
│  └────┬────────────────────────────────────────────────┘     │
│       │                                                      │
│  ┌────┴──────────────────────────────────────────────┐       │
│  │              Next.js API Routes (Route Handlers)   │       │
│  │  /api/prices  /api/news  /api/agents  /api/chat   │       │
│  └────┬──────────────────────────────────────────────┘       │
└───────┼──────────────────────────────────────────────────────┘
        │
┌───────┼──────────────────────────────────────────────────────┐
│ Data Layer                                                    │
│  ┌────┴──────┐  ┌────────────────┐  ┌──────────────────┐    │
│  │  SQLite   │  │  Price Service  │  │  Agent Scheduler  │    │
│  │  (Drizzle │  │  (Unified API   │  │  (node-cron)      │    │
│  │   ORM)    │  │   abstraction)  │  │                   │    │
│  └───────────┘  └───────┬────────┘  └────────┬──────────┘    │
│                         │                     │               │
│  ┌──────────────────────┴─────────────────────┴────────┐     │
│  │                External Services                     │     │
│  │  Finnhub · CoinGecko · Metals.Dev · ECB · Claude API │     │
│  └──────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────┘
```

### 1.2 Technology Stack Decisions

**Database: SQLite via better-sqlite3 + Drizzle ORM**

Rationale: Local-first is non-negotiable for Phase 1. SQLite eliminates Docker/Postgres complexity, runs in-process (zero latency), supports full-text search via FTS5, handles JSON columns natively, and Drizzle provides type-safe schemas with excellent migration tooling. The WAL journal mode handles concurrent reads from the UI while agents write in the background. SQLite comfortably handles the data volume of a personal investment tool (tens of thousands of rows, not millions).

Trade-off acknowledged: If the system ever needs multi-process writes at high concurrency, migrate to Turso (SQLite-compatible, edge-ready) or PostgreSQL. Drizzle ORM supports all three, so the migration path is clean.

**Background Jobs: node-cron + custom scheduler**

Rationale: BullMQ requires Redis — unnecessary infrastructure for a solo developer. Bree is overpowered. node-cron provides cron-syntax scheduling, runs in the Next.js process, and is trivial to configure. Agent runs are stored in the database for observability.

**State Management: TanStack Query (server state) + Zustand (client state)**

TanStack Query handles all data fetching, caching, background refetching, and optimistic updates. It replaces 90% of what you'd otherwise use Redux/Zustand for in a data-heavy app. Zustand holds only UI state: active filters, selected tab, sidebar state, theme. This separation keeps the codebase clean.

**Charts: Lightweight Charts (TradingView) + Recharts**

Lightweight Charts for financial price charts (candlestick, area, histogram) — purpose-built for financial data, fast rendering, small bundle. Recharts for portfolio composition pie charts, P&L bar charts, and other non-financial visualizations. Both integrate cleanly with React.

**Real-time Strategy: Tiered polling (no WebSocket needed)**

Price data: 60-second polling during market hours, 5-minute during off-hours. News: 5-minute polling. Agent results: event-driven (poll after agent run completes). Portfolio valuations: computed client-side from cached prices. WebSocket is unnecessary for a personal tool polling free-tier APIs — it adds complexity without benefit given the API rate limits.

**Deployment: Local Next.js (dev server initially, then `next build && next start`)**

Rationale: Tauri adds native compilation complexity for minimal benefit at this stage. Electron is bloated. A local Next.js server on `localhost:3000` provides the full experience. Tauri can be evaluated for Phase 2 if offline/desktop packaging becomes a priority.

### 1.3 Project Structure

```
meridian/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── layout.tsx          # Root layout (dark theme, sidebar)
│   │   ├── page.tsx            # Dashboard/Portfolio
│   │   ├── wire/               # The Wire (Newsfeed)
│   │   ├── desk/               # The Desk (Recommendations)
│   │   ├── archive/            # The Archive (Knowledge Library)
│   │   ├── forum/              # The Forum (Chat)
│   │   ├── settings/           # Settings & Agent Configuration
│   │   └── api/                # Route Handlers
│   │       ├── prices/
│   │       ├── portfolio/
│   │       ├── news/
│   │       ├── agents/
│   │       ├── knowledge/
│   │       ├── chat/
│   │       └── cron/           # Agent trigger endpoints
│   ├── lib/
│   │   ├── db/
│   │   │   ├── schema.ts       # Drizzle schema (all tables)
│   │   │   ├── index.ts        # Database connection
│   │   │   └── migrations/
│   │   ├── services/
│   │   │   ├── price-service.ts      # Unified price abstraction
│   │   │   ├── finnhub.ts            # Finnhub API client
│   │   │   ├── coingecko.ts          # CoinGecko API client
│   │   │   ├── metals-dev.ts         # Metals.Dev API client
│   │   │   ├── ecb-rates.ts          # ECB exchange rates
│   │   │   └── news-service.ts       # News aggregation
│   │   ├── agents/
│   │   │   ├── scheduler.ts          # Agent scheduling (node-cron)
│   │   │   ├── base-agent.ts         # Abstract agent class
│   │   │   ├── sentinel.ts           # News monitoring agent
│   │   │   ├── scout.ts              # Opportunity scanning agent
│   │   │   ├── librarian.ts          # Knowledge curation agent
│   │   │   └── strategist.ts         # Synthesis agent
│   │   ├── ai/
│   │   │   ├── claude-client.ts      # Anthropic SDK wrapper
│   │   │   └── prompts/              # Agent prompt templates
│   │   └── utils/
│   │       ├── currency.ts           # EUR conversion utilities
│   │       ├── rate-limiter.ts       # API rate limiting
│   │       └── dedup.ts              # Content deduplication
│   ├── components/
│   │   ├── ui/                       # shadcn/ui components
│   │   ├── portfolio/
│   │   ├── wire/
│   │   ├── desk/
│   │   ├── archive/
│   │   ├── forum/
│   │   └── shared/
│   ├── hooks/
│   │   ├── use-prices.ts
│   │   ├── use-portfolio.ts
│   │   └── use-agents.ts
│   └── stores/
│       └── ui-store.ts              # Zustand UI state
├── drizzle.config.ts
├── package.json
├── tailwind.config.ts
└── .env.local
```

---

## 2. Data Model

All schemas use Drizzle ORM syntax. SQLite is the target database.

### 2.1 Core Schema

```typescript
// src/lib/db/schema.ts
import { sqliteTable, text, integer, real, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ============================================================
// PORTFOLIO & ASSETS
// ============================================================

/**
 * Asset definitions — the "what" of any holding or watchlist item.
 * One row per unique asset (e.g., AAPL, BTC, XAU).
 */
export const assets = sqliteTable('assets', {
  id: text('id').primaryKey(),                    // UUID v4
  symbol: text('symbol').notNull(),               // AAPL, BTC, XAU
  name: text('name').notNull(),                   // Apple Inc., Bitcoin, Gold
  assetClass: text('asset_class').notNull(),       // 'stock' | 'crypto' | 'metal'
  exchange: text('exchange'),                      // NYSE, NASDAQ, XETRA (stocks only)
  currency: text('currency').notNull(),            // Original trading currency (USD, EUR, etc.)
  metadata: text('metadata', { mode: 'json' }),    // Flexible JSON: sector, industry, network, purity
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
}, (table) => ({
  symbolClassIdx: uniqueIndex('idx_assets_symbol_class').on(table.symbol, table.assetClass),
  classIdx: index('idx_assets_class').on(table.assetClass),
}));

/**
 * Portfolio holdings — current positions.
 * Multiple holdings per asset allowed (e.g., bought at different times).
 */
export const holdings = sqliteTable('holdings', {
  id: text('id').primaryKey(),
  assetId: text('asset_id').notNull().references(() => assets.id),
  quantity: real('quantity').notNull(),            // Shares, coins, or grams
  costBasisPerUnit: real('cost_basis_per_unit').notNull(),  // In original currency
  costBasisEur: real('cost_basis_eur').notNull(),           // In EUR at time of purchase
  purchaseDate: text('purchase_date').notNull(),            // ISO date
  notes: text('notes'),
  isClosed: integer('is_closed', { mode: 'boolean' }).default(false),
  closedDate: text('closed_date'),
  closedPricePerUnit: real('closed_price_per_unit'),
  closedPriceEur: real('closed_price_eur'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
}, (table) => ({
  assetIdx: index('idx_holdings_asset').on(table.assetId),
  openIdx: index('idx_holdings_open').on(table.isClosed),
}));

/**
 * Watchlist — assets being tracked but not held.
 */
export const watchlist = sqliteTable('watchlist', {
  id: text('id').primaryKey(),
  assetId: text('asset_id').notNull().references(() => assets.id),
  targetPriceLow: real('target_price_low'),       // EUR — alert if price drops below
  targetPriceHigh: real('target_price_high'),      // EUR — alert if price rises above
  notes: text('notes'),
  addedAt: text('added_at').default(sql`(datetime('now'))`),
}, (table) => ({
  assetIdx: uniqueIndex('idx_watchlist_asset').on(table.assetId),
}));

// ============================================================
// PRICE CACHE
// ============================================================

/**
 * Cached price data — both current and historical.
 * The price service writes here; the UI reads from here.
 */
export const priceCache = sqliteTable('price_cache', {
  id: text('id').primaryKey(),
  assetId: text('asset_id').notNull().references(() => assets.id),
  priceType: text('price_type').notNull(),         // 'spot' | 'daily_close' | 'historical'
  priceOriginal: real('price_original').notNull(),  // In asset's native currency
  priceEur: real('price_eur').notNull(),            // Converted to EUR
  currency: text('currency').notNull(),             // Original currency code
  eurRate: real('eur_rate').notNull(),              // EUR conversion rate used
  timestamp: text('timestamp').notNull(),           // ISO datetime
  source: text('source').notNull(),                 // 'finnhub' | 'coingecko' | 'metals_dev' | 'ecb'
  metadata: text('metadata', { mode: 'json' }),     // OHLCV data, volume, etc.
}, (table) => ({
  assetTimeIdx: index('idx_price_asset_time').on(table.assetId, table.timestamp),
  typeIdx: index('idx_price_type').on(table.priceType),
  timestampIdx: index('idx_price_timestamp').on(table.timestamp),
}));

/**
 * EUR exchange rates cache — from ECB.
 */
export const fxRates = sqliteTable('fx_rates', {
  id: text('id').primaryKey(),
  currency: text('currency').notNull(),            // USD, GBP, CHF, etc.
  rateToEur: real('rate_to_eur').notNull(),         // 1 EUR = X currency (inverted for conversion)
  date: text('date').notNull(),                     // ISO date
  source: text('source').default('ecb'),
}, (table) => ({
  currencyDateIdx: uniqueIndex('idx_fx_currency_date').on(table.currency, table.date),
}));

// ============================================================
// THE WIRE (Newsfeed)
// ============================================================

export const newsItems = sqliteTable('news_items', {
  id: text('id').primaryKey(),
  externalId: text('external_id'),                 // Source's own ID for dedup
  title: text('title').notNull(),
  summary: text('summary'),
  content: text('content'),                        // Full text if available
  url: text('url').notNull(),
  source: text('source').notNull(),                // Reuters, Bloomberg, Finnhub, etc.
  sourceQuality: integer('source_quality'),         // 1-10 quality ranking
  publishedAt: text('published_at').notNull(),
  fetchedAt: text('fetched_at').default(sql`(datetime('now'))`),

  // Relevance & categorization
  category: text('category'),                      // 'geopolitics' | 'macro' | 'central_bank' | 'tech' | 'energy' | 'regulatory'
  relatedAssets: text('related_assets', { mode: 'json' }),  // Array of asset IDs
  relevanceScore: real('relevance_score'),          // 0-1, computed by Sentinel
  sentiment: text('sentiment'),                     // 'bullish' | 'bearish' | 'neutral'
  sentimentScore: real('sentiment_score'),           // -1 to 1
  sentimentAssets: text('sentiment_assets', { mode: 'json' }),  // Per-asset sentiment map

  // Deduplication
  contentHash: text('content_hash'),               // SHA-256 of normalized title + first 200 chars
  clusterId: text('cluster_id'),                   // Group duplicate stories

  // Time decay
  decayScore: real('decay_score'),                  // Computed: relevance * time_decay_factor

  isRead: integer('is_read', { mode: 'boolean' }).default(false),
  isBookmarked: integer('is_bookmarked', { mode: 'boolean' }).default(false),
}, (table) => ({
  publishedIdx: index('idx_news_published').on(table.publishedAt),
  categoryIdx: index('idx_news_category').on(table.category),
  sentimentIdx: index('idx_news_sentiment').on(table.sentiment),
  hashIdx: uniqueIndex('idx_news_hash').on(table.contentHash),
  relevanceIdx: index('idx_news_relevance').on(table.relevanceScore),
}));

// ============================================================
// THE DESK (Recommendations)
// ============================================================

export const recommendations = sqliteTable('recommendations', {
  id: text('id').primaryKey(),
  agentId: text('agent_id').notNull(),              // 'scout' | 'strategist'
  type: text('type').notNull(),                     // 'opportunity' | 'risk_warning' | 'rebalance' | 'macro_thesis'

  // Core recommendation
  title: text('title').notNull(),
  thesis: text('thesis').notNull(),                 // Main argument
  evidence: text('evidence', { mode: 'json' }),     // Array of supporting data points
  riskAssessment: text('risk_assessment').notNull(),
  confidence: real('confidence').notNull(),          // 0-1
  timeHorizon: text('time_horizon').notNull(),       // 'days' | 'weeks' | 'months' | 'quarters' | 'years'

  // Related assets
  relatedAssets: text('related_assets', { mode: 'json' }),  // Array of { assetId, action: 'buy'|'sell'|'hold'|'watch' }

  // Tracking
  status: text('status').default('active'),         // 'active' | 'expired' | 'validated' | 'invalidated'
  outcomeNotes: text('outcome_notes'),
  accuracyScore: real('accuracy_score'),            // Retrospective 0-1 score

  createdAt: text('created_at').default(sql`(datetime('now'))`),
  expiresAt: text('expires_at'),
  reviewedAt: text('reviewed_at'),
}, (table) => ({
  typeIdx: index('idx_rec_type').on(table.type),
  statusIdx: index('idx_rec_status').on(table.status),
  confidenceIdx: index('idx_rec_confidence').on(table.confidence),
  createdIdx: index('idx_rec_created').on(table.createdAt),
}));

// ============================================================
// THE ARCHIVE (Knowledge Library)
// ============================================================

export const knowledgeEntries = sqliteTable('knowledge_entries', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  slug: text('slug').notNull(),                    // URL-friendly ID
  domain: text('domain').notNull(),                 // 'financial_math' | 'behavioral_econ' | 'macro' | 'futures_studies' | 'game_theory' | 'complexity'
  subdomain: text('subdomain'),

  // Content
  summary: text('summary').notNull(),              // 2-3 sentence overview
  explanation: text('explanation').notNull(),        // Full explanation (markdown)
  mathematicalFormulation: text('math_formulation'), // LaTeX/KaTeX notation
  practicalApplication: text('practical_application').notNull(),  // How to apply to investing
  limitations: text('limitations'),                 // Known limitations / critiques

  // Metadata
  authors: text('authors', { mode: 'json' }),       // Original theory authors
  year: integer('year'),                            // Year of publication/formulation
  sourceUrl: text('source_url'),
  doi: text('doi'),
  tags: text('tags', { mode: 'json' }),             // Array of string tags
  relatedEntries: text('related_entries', { mode: 'json' }),  // Array of entry IDs

  // Curation
  addedBy: text('added_by').default('system'),      // 'system' | 'librarian' | 'user'
  isVerified: integer('is_verified', { mode: 'boolean' }).default(false),
  qualityScore: real('quality_score'),

  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
}, (table) => ({
  slugIdx: uniqueIndex('idx_knowledge_slug').on(table.slug),
  domainIdx: index('idx_knowledge_domain').on(table.domain),
}));

// ============================================================
// THE FORUM (Conversations)
// ============================================================

export const conversations = sqliteTable('conversations', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  type: text('type').default('general'),            // 'general' | 'scenario_planning' | 'portfolio_review' | 'strategy_session'
  isArchived: integer('is_archived', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id').notNull().references(() => conversations.id),
  role: text('role').notNull(),                     // 'user' | 'assistant' | 'system'
  content: text('content').notNull(),
  agentId: text('agent_id'),                        // Which agent responded (if assistant)
  toolCalls: text('tool_calls', { mode: 'json' }),  // Claude tool use records
  tokenUsage: text('token_usage', { mode: 'json' }),// { input, output, model }
  createdAt: text('created_at').default(sql`(datetime('now'))`),
}, (table) => ({
  convIdx: index('idx_messages_conv').on(table.conversationId),
  createdIdx: index('idx_messages_created').on(table.createdAt),
}));

// ============================================================
// AGENT SYSTEM
// ============================================================

export const agentRuns = sqliteTable('agent_runs', {
  id: text('id').primaryKey(),
  agentId: text('agent_id').notNull(),              // 'sentinel' | 'scout' | 'librarian' | 'strategist'
  triggerType: text('trigger_type').notNull(),       // 'scheduled' | 'manual' | 'event'
  status: text('status').notNull(),                  // 'running' | 'completed' | 'failed' | 'cancelled'

  // Execution details
  startedAt: text('started_at').default(sql`(datetime('now'))`),
  completedAt: text('completed_at'),
  durationMs: integer('duration_ms'),

  // Results & costs
  result: text('result', { mode: 'json' }),         // Agent-specific output
  error: text('error'),
  tokensInput: integer('tokens_input'),
  tokensOutput: integer('tokens_output'),
  model: text('model'),                             // claude-sonnet-4-5, claude-opus-4-5
  estimatedCostUsd: real('estimated_cost_usd'),

  // Context
  config: text('config', { mode: 'json' }),         // Run-specific configuration
}, (table) => ({
  agentIdx: index('idx_runs_agent').on(table.agentId),
  statusIdx: index('idx_runs_status').on(table.status),
  startedIdx: index('idx_runs_started').on(table.startedAt),
}));

// ============================================================
// SETTINGS
// ============================================================

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value', { mode: 'json' }).notNull(),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});
```

### 2.2 Normalization Notes

The schema is deliberately pragmatic, not fully normalized. JSON columns (`metadata`, `relatedAssets`, `tags`, `evidence`) are used where the data is always read/written as a unit and never needs to be queried relationally. This avoids junction table proliferation for a single-user system while keeping queries fast. If relational querying of tags becomes necessary, add a `knowledge_tags` junction table later — the migration is simple.

Timestamps are ISO 8601 strings rather than Unix integers for human readability in SQLite tools. Drizzle handles the conversion transparently.

### 2.3 Full-Text Search

SQLite FTS5 virtual tables for searchable content:

```sql
-- Run as migration
CREATE VIRTUAL TABLE news_fts USING fts5(title, summary, content, content='news_items', content_rowid='rowid');
CREATE VIRTUAL TABLE knowledge_fts USING fts5(title, summary, explanation, practical_application, content='knowledge_entries', content_rowid='rowid');
CREATE VIRTUAL TABLE messages_fts USING fts5(content, content='messages', content_rowid='rowid');

-- Triggers to keep FTS in sync
CREATE TRIGGER news_ai AFTER INSERT ON news_items BEGIN
  INSERT INTO news_fts(rowid, title, summary, content) VALUES (new.rowid, new.title, new.summary, new.content);
END;
-- (similar triggers for UPDATE and DELETE, and for other FTS tables)
```

---

## 3. API Integration Layer

### 3.1 API Selection Summary

| Data Need | Primary API | Fallback | Free Tier Limits |
|-----------|-------------|----------|------------------|
| Stock quotes & fundamentals | **Finnhub** | Alpha Vantage | 60 req/min (no daily cap) |
| Stock historical OHLCV | **Finnhub** | Alpha Vantage | 60 req/min |
| Crypto prices (spot + historical) | **CoinGecko Demo** | — | 30 req/min, 10,000/month |
| Metal spot prices | **Metals.Dev** | GoldAPI.io | 100 req/month |
| EUR exchange rates | **ECB SDMX API** | — | Unlimited, free, official |
| Financial news | **Finnhub News** | RSS feeds | Included in 60 req/min |
| News sentiment | **Claude API** (agent) | Finnhub sentiment | Per-agent token budget |

### 3.2 Finnhub (Stocks — Primary)

**Registration**: https://finnhub.io/register — free API key, no credit card required.

**Free tier**: 60 API calls/minute, 30 calls/second. No daily cap. Includes real-time US quotes (slight delay for free), company profiles, basic financials, news, and WebSocket for real-time trades.

**Key endpoints**:

```typescript
// src/lib/services/finnhub.ts
const FINNHUB_BASE = 'https://finnhub.io/api/v1';

interface FinnhubClient {
  // Real-time quote
  getQuote(symbol: string): Promise<{
    c: number;  // Current price
    d: number;  // Change
    dp: number; // Percent change
    h: number;  // High of day
    l: number;  // Low of day
    o: number;  // Open
    pc: number; // Previous close
    t: number;  // Timestamp
  }>;

  // Historical candles (OHLCV)
  getCandles(symbol: string, resolution: '1' | '5' | '15' | '30' | '60' | 'D' | 'W' | 'M', from: number, to: number): Promise<{
    c: number[]; h: number[]; l: number[]; o: number[]; v: number[]; t: number[]; s: string;
  }>;

  // Company profile
  getProfile(symbol: string): Promise<{
    country: string; currency: string; exchange: string;
    finnhubIndustry: string; ipo: string; name: string;
    ticker: string; weburl: string; marketCapitalization: number;
  }>;

  // Company news
  getNews(symbol: string, from: string, to: string): Promise<Array<{
    category: string; datetime: number; headline: string;
    id: number; image: string; related: string;
    source: string; summary: string; url: string;
  }>>;

  // General market news
  getMarketNews(category: 'general' | 'forex' | 'crypto' | 'merger'): Promise<Array<{...}>>;
}
```

**Caching strategy**: Spot quotes cached 60 seconds. Historical candles cached 24 hours (immutable once market closes). Company profiles cached 7 days. News cached 5 minutes.

**Rate limiting**: Implement token bucket with 60 tokens/minute, 30 tokens/second burst. Queue requests when bucket is empty.

**European stocks**: Finnhub supports XETRA (suffix `.DE`), Euronext (`.PA`, `.AS`), LSE (`.L`). Symbol format varies by exchange — store the full Finnhub symbol in the `assets.symbol` field.

### 3.3 Alpha Vantage (Stocks — Fallback & MCP)

**Free tier**: 25 requests/day, 5 requests/minute. Extremely limited for polling but valuable for two use cases: (1) MCP server integration with Claude Code for ad-hoc queries during development, (2) Historical data backfill (daily close going back 20+ years).

**MCP server**: Official at https://mcp.alphavantage.co/ — install for Claude Code integration.

**When to use**: Only for historical backfill (one-time data loads) and through the MCP server for interactive analysis. Never use for scheduled polling.

### 3.4 CoinGecko (Crypto — Primary)

**Registration**: https://www.coingecko.com/en/api — Demo plan, free, requires account.

**Free tier (Demo)**: 30 requests/minute, 10,000 calls/month. Sufficient for tracking ~20 crypto assets with 5-minute polling during active hours.

**Key endpoints**:

```typescript
// src/lib/services/coingecko.ts
const CG_BASE = 'https://api.coingecko.com/api/v3';
// Demo key uses: 'https://pro-api.coingecko.com/api/v3' with x-cg-demo-api-key header

interface CoinGeckoClient {
  // Simple price (most efficient — multiple coins in one call)
  getSimplePrice(ids: string[], vsCurrencies: string[]): Promise<{
    [coinId: string]: { eur: number; eur_24h_change: number; eur_24h_vol: number; eur_market_cap: number; last_updated_at: number; }
  }>;

  // Market data with sparkline
  getMarkets(vsCurrency: string, params: { ids?: string; per_page?: number; page?: number; sparkline?: boolean; price_change_percentage?: string }): Promise<Array<{
    id: string; symbol: string; name: string; current_price: number;
    market_cap: number; total_volume: number; high_24h: number; low_24h: number;
    price_change_24h: number; price_change_percentage_24h: number;
    sparkline_in_7d?: { price: number[] };
  }>>;

  // Historical OHLC (1/7/14/30/90/180/365 days)
  getOHLC(id: string, vsCurrency: string, days: number): Promise<Array<[number, number, number, number, number]>>;

  // Historical market chart (granular)
  getMarketChart(id: string, vsCurrency: string, days: number): Promise<{
    prices: [number, number][]; market_caps: [number, number][]; total_volumes: [number, number][];
  }>;
}
```

**Caching strategy**: `/simple/price` cached 60 seconds (used for dashboard). `/markets` cached 5 minutes. Historical data cached 24 hours. Key optimization: batch multiple coin IDs into a single `/simple/price` call (up to 250 IDs per request).

**Monthly budget**: With 10,000 calls/month and batched price checks, this supports polling ~20 assets every 5 minutes during 16 active hours/day: `(16h × 60min / 5min) × 30 days = 5,760 calls/month` — comfortably within limits, leaving room for historical data pulls and market data requests.

### 3.5 Metals.Dev (Precious Metals — Primary)

**Registration**: https://metals.dev/ — free plan, no credit card.

**Free tier**: 100 requests/month. Updates every 60 seconds. Covers gold (XAU), silver (XAG), platinum (XPT), palladium (XPD) in EUR and 170+ currencies.

**Key endpoint**:

```typescript
// src/lib/services/metals-dev.ts
// GET https://api.metals.dev/v1/latest?api_key=KEY&currency=EUR&unit=gram
interface MetalsDevResponse {
  status: string;
  currency: string;
  unit: string;
  metals: {
    gold: number;      // EUR per gram
    silver: number;
    platinum: number;
    palladium: number;
  };
  timestamps: {
    metal: string;     // ISO datetime
    currency: string;
  };
}
```

**Caching strategy**: Cache spot prices for 15 minutes (metals move slowly). With 100 requests/month, schedule 3 fetches/day during market hours (London Fix at ~10:30 and ~15:00 CET, plus one midday). That's ~90 calls/month, leaving 10 for on-demand refreshes.

**Fallback (GoldAPI.io)**: 100 requests/month free. Similar endpoint: `GET https://www.goldapi.io/api/XAU/EUR`. Use as secondary source for price validation or when Metals.Dev quota is exhausted.

### 3.6 ECB SDMX API (EUR Exchange Rates)

**No API key required. No rate limits. Official ECB data.**

This is the gold standard for EUR reference rates. Published daily at ~16:00 CET for ~30 currencies. Historical data back to 1999.

```typescript
// src/lib/services/ecb-rates.ts

/**
 * Fetch latest EUR exchange rates from ECB.
 * URL pattern: https://data-api.ecb.europa.eu/service/data/EXR/D.{currencies}.EUR.SP00.A?format=csvdata&lastNObservations=1
 */
async function fetchEcbRates(currencies: string[] = ['USD', 'GBP', 'CHF', 'JPY', 'AUD', 'CAD']): Promise<Map<string, number>> {
  const key = `D.${currencies.join('+')}.EUR.SP00.A`;
  const url = `https://data-api.ecb.europa.eu/service/data/EXR/${key}?format=csvdata&lastNObservations=1`;

  // Parse CSV response — each row has CURRENCY and OBS_VALUE columns
  // OBS_VALUE is the rate: 1 EUR = X units of foreign currency
  // To convert foreign currency to EUR: amount_eur = amount_foreign / rate
}

/**
 * Alternative: ECB's XML feed for simple use cases
 * https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml
 * Updated daily, simple XML structure, no auth needed.
 */
```

**Caching**: Rates update once daily. Cache for 12 hours. Fetch on application start and at 16:30 CET via cron.

**Conversion pipeline**: All non-EUR prices are converted through the cached ECB rate. For intraday precision on stocks (where the USD/EUR rate matters minute-to-minute), the daily ECB rate is sufficient for a research/analysis tool — this is not a trading system. Store both the original price and the EUR price in `price_cache` for auditability.

### 3.7 Unified Price Service

```typescript
// src/lib/services/price-service.ts

interface PriceResult {
  assetId: string;
  priceOriginal: number;
  currency: string;
  priceEur: number;
  eurRate: number;
  timestamp: string;
  source: string;
}

class PriceService {
  constructor(
    private finnhub: FinnhubClient,
    private coingecko: CoinGeckoClient,
    private metalsDev: MetalsDevClient,
    private ecbRates: EcbRatesClient,
    private db: Database
  ) {}

  /**
   * Get current price for an asset, using cache if fresh enough.
   * Delegates to the appropriate API based on asset class.
   */
  async getPrice(asset: Asset, maxAgeSeconds: number = 60): Promise<PriceResult> {
    // 1. Check cache
    const cached = await this.getCachedPrice(asset.id, maxAgeSeconds);
    if (cached) return cached;

    // 2. Fetch from appropriate API
    let result: PriceResult;
    switch (asset.assetClass) {
      case 'stock':
        result = await this.fetchStockPrice(asset);
        break;
      case 'crypto':
        result = await this.fetchCryptoPrice(asset);
        break;
      case 'metal':
        result = await this.fetchMetalPrice(asset);
        break;
    }

    // 3. Convert to EUR if needed
    if (result.currency !== 'EUR') {
      const rate = await this.ecbRates.getRate(result.currency);
      result.priceEur = result.priceOriginal / rate;
      result.eurRate = rate;
    }

    // 4. Cache and return
    await this.cachePrice(result);
    return result;
  }

  /**
   * Batch price fetch — optimized for dashboard loading.
   * Groups assets by class and makes minimal API calls.
   */
  async getBatchPrices(assets: Asset[]): Promise<Map<string, PriceResult>> {
    const stocks = assets.filter(a => a.assetClass === 'stock');
    const cryptos = assets.filter(a => a.assetClass === 'crypto');
    const metals = assets.filter(a => a.assetClass === 'metal');

    const results = new Map<string, PriceResult>();

    // Crypto: single CoinGecko call with all IDs (most efficient)
    if (cryptos.length > 0) {
      const ids = cryptos.map(c => c.metadata?.coingeckoId).filter(Boolean);
      const prices = await this.coingecko.getSimplePrice(ids, ['eur']);
      // Map results...
    }

    // Metals: single Metals.Dev call gets all four metals
    if (metals.length > 0) {
      const metalPrices = await this.metalsDev.getLatest('EUR', 'gram');
      // Map results...
    }

    // Stocks: individual Finnhub calls (no batch endpoint on free tier)
    // Rate-limited: max 60/minute
    for (const stock of stocks) {
      const price = await this.finnhub.getQuote(stock.symbol);
      // Map result...
    }

    return results;
  }
}
```

### 3.8 Error Handling & Retry Strategy

```typescript
// src/lib/utils/rate-limiter.ts

/**
 * Token bucket rate limiter with queue.
 * Each API gets its own instance with appropriate limits.
 */
class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private queue: Array<{ resolve: Function; reject: Function }> = [];

  constructor(
    private maxTokens: number,     // e.g., 60 for Finnhub
    private refillRate: number,    // tokens per second
    private refillInterval: number // ms between refills
  ) {
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  async acquire(): Promise<void> {
    this.refill();
    if (this.tokens > 0) {
      this.tokens--;
      return;
    }
    // Queue the request
    return new Promise((resolve, reject) => {
      this.queue.push({ resolve, reject });
    });
  }
}

/**
 * Retry wrapper with exponential backoff.
 * Handles 429 (rate limit), 5xx (server error), and network failures.
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxRetries?: number; baseDelayMs?: number; maxDelayMs?: number } = {}
): Promise<T> {
  const { maxRetries = 3, baseDelayMs = 1000, maxDelayMs = 30000 } = options;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;

      const isRetryable = error.status === 429 || error.status >= 500 || error.code === 'ECONNREFUSED';
      if (!isRetryable) throw error;

      const delay = Math.min(baseDelayMs * Math.pow(2, attempt) + Math.random() * 1000, maxDelayMs);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

---

## 4. Agent System Architecture

### 4.1 Agent Lifecycle

Agents are background processes that execute Claude API calls on a schedule or on-demand. Each agent follows a consistent lifecycle:

```
TRIGGER (cron | manual | event)
  → PREPARE (load context from DB)
    → EXECUTE (Claude API call with structured tool use)
      → PROCESS (parse response, validate output schema)
        → PERSIST (write results to DB, update agent_runs)
          → NOTIFY (update feeds, flag high-priority items)
```

### 4.2 Base Agent Implementation

```typescript
// src/lib/agents/base-agent.ts
import Anthropic from '@anthropic-ai/sdk';
import { v4 as uuid } from 'uuid';

interface AgentConfig {
  id: string;                // 'sentinel' | 'scout' | 'librarian' | 'strategist'
  name: string;
  model: 'claude-sonnet-4-5-20250929' | 'claude-opus-4-5-20251101';
  maxTokensInput: number;    // Budget cap for input tokens
  maxTokensOutput: number;   // Budget cap for output tokens
  schedule: string;          // Cron expression
  tools?: Anthropic.Tool[];  // Structured tool definitions
}

abstract class BaseAgent {
  protected client: Anthropic;
  protected db: Database;

  constructor(protected config: AgentConfig) {
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  async run(trigger: 'scheduled' | 'manual' | 'event'): Promise<void> {
    const runId = uuid();

    // Record run start
    await this.db.insert(agentRuns).values({
      id: runId,
      agentId: this.config.id,
      triggerType: trigger,
      status: 'running',
      model: this.config.model,
    });

    try {
      // 1. Gather context
      const context = await this.gatherContext();

      // 2. Build messages
      const messages = this.buildMessages(context);

      // 3. Execute Claude API call
      const response = await this.client.messages.create({
        model: this.config.model,
        max_tokens: this.config.maxTokensOutput,
        system: this.getSystemPrompt(),
        messages,
        tools: this.config.tools,
      });

      // 4. Process response
      const result = await this.processResponse(response);

      // 5. Persist results
      await this.persistResults(result);

      // 6. Update run record
      const usage = response.usage;
      await this.db.update(agentRuns)
        .set({
          status: 'completed',
          completedAt: new Date().toISOString(),
          durationMs: Date.now() - startTime,
          result: JSON.stringify(result),
          tokensInput: usage.input_tokens,
          tokensOutput: usage.output_tokens,
          estimatedCostUsd: this.estimateCost(usage),
        })
        .where(eq(agentRuns.id, runId));

    } catch (error) {
      await this.db.update(agentRuns)
        .set({ status: 'failed', error: error.message, completedAt: new Date().toISOString() })
        .where(eq(agentRuns.id, runId));
      throw error;
    }
  }

  private estimateCost(usage: { input_tokens: number; output_tokens: number }): number {
    const pricing = {
      'claude-sonnet-4-5-20250929': { input: 3.0, output: 15.0 },
      'claude-opus-4-5-20251101': { input: 5.0, output: 25.0 },
    };
    const rates = pricing[this.config.model];
    return (usage.input_tokens * rates.input + usage.output_tokens * rates.output) / 1_000_000;
  }

  abstract gatherContext(): Promise<any>;
  abstract getSystemPrompt(): string;
  abstract buildMessages(context: any): Anthropic.MessageParam[];
  abstract processResponse(response: Anthropic.Message): Promise<any>;
  abstract persistResults(result: any): Promise<void>;
}
```

### 4.3 Agent Scheduling

```typescript
// src/lib/agents/scheduler.ts
import cron from 'node-cron';

const SCHEDULES = {
  sentinel: {
    schedule: '*/5 * * * *',     // Every 5 minutes during market hours
    model: 'claude-sonnet-4-5-20250929',
    description: 'News monitoring and sentiment tagging',
  },
  scout: {
    schedule: '0 */4 * * *',     // Every 4 hours
    model: 'claude-sonnet-4-5-20250929',
    description: 'Opportunity scanning and technical analysis',
  },
  librarian: {
    schedule: '0 2 * * 1',       // Weekly, Monday 2 AM
    model: 'claude-sonnet-4-5-20250929',
    description: 'Knowledge discovery and indexing',
  },
  strategist: {
    schedule: '0 8 * * 1-5',     // Weekdays at 8 AM CET
    model: 'claude-opus-4-5-20251101',  // Deep analysis needs Opus
    description: 'Macro synthesis and strategic assessment',
  },
};

export function initializeAgentScheduler() {
  for (const [agentId, config] of Object.entries(SCHEDULES)) {
    cron.schedule(config.schedule, async () => {
      console.log(`[Agent] Running ${agentId}: ${config.description}`);
      try {
        const agent = createAgent(agentId);
        await agent.run('scheduled');
      } catch (error) {
        console.error(`[Agent] ${agentId} failed:`, error);
      }
    }, { timezone: 'Europe/Vienna' });
  }
}
```

### 4.4 Sentinel Agent (News Monitoring)

**Purpose**: Continuously scan news sources, filter for relevance to portfolio/watchlist, tag sentiment, identify emerging narratives. Feeds "The Wire."

**Model**: Claude Sonnet 4.5 (routine classification task — fast, cheap)

**Execution flow**:
1. Fetch latest news from Finnhub (market news + company news for portfolio assets)
2. Fetch RSS feeds from quality sources (see list below)
3. Deduplicate against existing `news_items` using content hash
4. For new items, call Claude to: classify category, assess relevance to portfolio, tag sentiment per asset, score quality
5. Write classified items to `news_items` table

**System prompt**:

```typescript
const SENTINEL_SYSTEM = `You are Sentinel, a financial news intelligence analyst. Your role is to classify, assess, and score news articles for an investment research platform.

For each article, you must return a structured JSON assessment:

{
  "category": "geopolitics" | "macro" | "central_bank" | "tech" | "energy" | "regulatory" | "earnings" | "market_structure",
  "relevanceScore": 0.0-1.0,  // How relevant to the user's portfolio/watchlist
  "sentiment": "bullish" | "bearish" | "neutral",
  "sentimentScore": -1.0 to 1.0,  // Granular sentiment intensity
  "sentimentAssets": {  // Per-asset sentiment when applicable
    "AAPL": { "sentiment": "bearish", "score": -0.6 },
    "XAU": { "sentiment": "bullish", "score": 0.8 }
  },
  "sourceQuality": 1-10,  // Source credibility (Reuters=9, random blog=2)
  "narrativeTag": "string",  // Emerging narrative label (e.g., "ECB rate trajectory", "AI chip shortage")
  "isActionable": boolean,  // Does this require attention?
  "summary": "2-sentence key takeaway"
}

CONTEXT: The user holds the following assets: {portfolio_assets}
The user watches: {watchlist_assets}

Prioritize news affecting these positions. Score relevance based on direct impact (earnings, regulatory changes) higher than indirect impact (macro trends). Quality sources: Reuters (9), Bloomberg (9), FT (8), ECB/BIS publications (10), academic preprints (7), mainstream financial media (6), social media/blogs (3).`;
```

**RSS feed sources** (quality-ranked):

```typescript
const RSS_FEEDS = [
  { url: 'https://www.ecb.europa.eu/rss/press.html', source: 'ECB Press', quality: 10 },
  { url: 'https://www.bis.org/doclist/bis_fsi.rss', source: 'BIS', quality: 10 },
  { url: 'https://feeds.a]reuters.com/reuters/businessNews', source: 'Reuters Business', quality: 9 },
  { url: 'https://feeds.bbci.co.uk/news/business/rss.xml', source: 'BBC Business', quality: 7 },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Business.xml', source: 'NYT Business', quality: 7 },
  { url: 'https://feeds.marketwatch.com/marketwatch/topstories/', source: 'MarketWatch', quality: 6 },
];
```

**Token budget**: ~2,000 input tokens per batch (10-15 articles) + ~1,000 output tokens = ~$0.02/run with Sonnet. At 5-minute intervals during 16h market hours: ~192 runs/day × $0.02 = ~$3.84/day. Optimize by batching multiple articles per call.

### 4.5 Scout Agent (Opportunity Scanning)

**Purpose**: Analyze price movements, technical patterns, fundamental data, and cross-asset correlations to surface potential trades or position adjustments. Feeds "The Desk."

**Model**: Claude Sonnet 4.5 (with Opus escalation for complex analysis)

**Execution flow**:
1. Pull latest prices and 30-day price history for all portfolio + watchlist assets
2. Compute technical indicators: RSI, MACD, moving averages (50/200-day), Bollinger Bands, volume trends
3. Pull recent Sentinel news with sentiment scores
4. Call Claude with price data + technicals + news context to identify opportunities
5. Write recommendations to `recommendations` table

**System prompt**:

```typescript
const SCOUT_SYSTEM = `You are Scout, an investment opportunity analyst combining technical analysis, fundamental data, and macro context.

Analyze the provided market data and generate investment insights. Each insight must follow this schema:

{
  "type": "opportunity" | "risk_warning" | "rebalance" | "macro_thesis",
  "title": "Concise insight title",
  "thesis": "1-2 paragraph argument explaining the opportunity or risk",
  "evidence": [
    { "type": "technical", "detail": "RSI at 28, oversold territory..." },
    { "type": "fundamental", "detail": "P/E ratio below 5-year average..." },
    { "type": "macro", "detail": "ECB signaling dovish pivot..." },
    { "type": "correlation", "detail": "Gold/EUR divergence historically..." }
  ],
  "riskAssessment": "Key risks: ...",
  "confidence": 0.0-1.0,
  "timeHorizon": "days" | "weeks" | "months" | "quarters",
  "relatedAssets": [{ "assetId": "...", "action": "buy" | "sell" | "hold" | "watch" }]
}

RULES:
- Never recommend all-in positions. Frame as relative sizing.
- Always include risk assessment. No thesis without counter-thesis.
- Confidence above 0.8 requires strong multi-signal convergence.
- Flag when your analysis contradicts recent Strategist assessments.
- This is a research tool, not financial advice. Frame accordingly.

PORTFOLIO STATE:
{portfolio_summary}

PRICE DATA:
{price_data_json}

RECENT NEWS SENTIMENT:
{sentiment_summary}`;
```

**Token budget**: ~4,000 input (price data + context) + ~2,000 output = ~$0.04/run. At 6 runs/day: ~$0.24/day.

### 4.6 Librarian Agent (Knowledge Curation)

**Purpose**: Discover, summarize, and index academic papers, theories, and analytical frameworks. Maintains "The Archive."

**Model**: Claude Sonnet 4.5

**Execution flow**:
1. Query academic sources (Semantic Scholar API, arXiv RSS for q-fin, SSRN) for recent papers in relevant domains
2. Cross-reference against existing knowledge entries to avoid duplicates
3. For novel entries, call Claude to: summarize, extract mathematical formulations, identify practical investment applications, generate tags and cross-references
4. Write to `knowledge_entries` table with `addedBy: 'librarian'`

**Schedule**: Weekly (Monday 2 AM CET) — knowledge doesn't need real-time updates.

**Token budget**: ~6,000 input (paper abstracts + existing entries) + ~4,000 output = ~$0.07/run. Weekly: ~$0.28/month.

### 4.7 Strategist Agent (Macro Synthesis)

**Purpose**: Synthesize all other agents' outputs plus historical analysis to form macro-level views, anticipate developments, and challenge existing assumptions. Participates in "The Forum" and contributes to "The Desk."

**Model**: Claude Opus 4.5 — this is the deep thinker that justifies Opus pricing.

**Execution flow**:
1. Gather: portfolio state, recent Sentinel news digest, active Scout recommendations, recent knowledge library additions, current macro indicators (yield curves, VIX, DXY)
2. Call Claude Opus with extensive context for strategic analysis
3. Generate: macro thesis updates, scenario analyses, assumption challenges, rebalancing suggestions
4. Write to `recommendations` table (type: 'macro_thesis') and optionally to a Forum conversation

**System prompt**:

```typescript
const STRATEGIST_SYSTEM = `You are Strategist, a senior macro-economic analyst and investment strategist. Your role is to synthesize information across all domains to form coherent strategic views.

You think in terms of:
- Regime identification: What economic regime are we in? What transitions are likely?
- Scenario planning: What are the 3-4 most plausible future scenarios? What probability do you assign to each?
- Historical parallels: What past periods most closely resemble current conditions?
- Portfolio stress testing: How would the current portfolio perform under each scenario?
- Assumption challenging: What beliefs does the current portfolio implicitly embed? Are they still valid?

OUTPUT SCHEMA:
{
  "macroRegime": { "current": "...", "confidence": 0.7, "transitionRisks": [...] },
  "scenarios": [
    {
      "name": "Base case: Soft landing",
      "probability": 0.45,
      "description": "...",
      "portfolioImpact": { "stocks": "+5-8%", "gold": "-2%", "crypto": "+10-15%" },
      "signals": ["Watch for: ...", "Invalidated if: ..."]
    }
  ],
  "historicalParallels": [{ "period": "2018-2019", "similarity": 0.7, "keyDifference": "..." }],
  "assumptions": [
    { "assumption": "ECB will cut rates before Q3", "validity": 0.6, "challenge": "..." }
  ],
  "recommendations": [...],  // Same schema as Scout recommendations
  "nextReview": "2026-03-15"
}

PORTFOLIO:
{portfolio_full}

RECENT NEWS DIGEST:
{news_digest}

ACTIVE RECOMMENDATIONS:
{active_recs}

MACRO INDICATORS:
{macro_data}`;
```

**Token budget**: ~8,000 input + ~4,000 output = ~$0.14/run with Opus. Weekday mornings only: ~22 runs/month = ~$3.08/month.

### 4.8 Cost Summary

| Agent | Model | Frequency | Estimated Monthly Cost |
|-------|-------|-----------|----------------------|
| Sentinel | Sonnet 4.5 | Every 5 min (16h/day) | ~$115 |
| Scout | Sonnet 4.5 | Every 4 hours | ~$7 |
| Librarian | Sonnet 4.5 | Weekly | ~$0.28 |
| Strategist | Opus 4.5 | Weekday mornings | ~$3.08 |
| Forum (chat) | Sonnet 4.5 / Opus 4.5 | On-demand | ~$5-20 (usage dependent) |
| **Total** | | | **~$130-145/month** |

**Optimization levers**:
- Reduce Sentinel frequency to every 15 minutes: drops to ~$38/month
- Use prompt caching for repeated system prompts (90% savings on cached tokens)
- Batch more articles per Sentinel call (currently conservative at 10-15)
- Use Haiku 4.5 ($1/$5) for simple classification tasks within Sentinel

**Recommended starting configuration**: Sentinel every 15 minutes, other agents as specified. Estimated: **~$50-60/month** for the full agent system.

### 4.9 Inter-Agent Communication

Agents communicate through the **shared database**, not direct message passing. This is simpler, auditable, and naturally handles the asynchronous nature of scheduled agents.

Communication patterns:
- Sentinel writes to `news_items` → Scout reads recent news for context
- Scout writes to `recommendations` → Strategist reads active recommendations
- Librarian writes to `knowledge_entries` → Strategist and Forum can reference theories
- Strategist writes to `recommendations` + optionally to `conversations`/`messages`

No message queue or event bus needed. Each agent queries the database for the latest state of the world when it runs.

---

## 5. Feature Specifications

### 5.1 Portfolio Management (Dashboard — `/`)

**Layout**: Full-width dashboard with four primary zones:

1. **Portfolio Summary Bar** (top): Total portfolio value in EUR, 24h change (absolute + %), asset allocation donut chart, and a sparkline of total portfolio value over 30 days.

2. **Holdings Table** (main area): Sortable data grid showing each holding with columns: Asset (icon + ticker + name), Class, Quantity, Avg Cost (EUR), Current Price (EUR), Market Value (EUR), P&L (EUR + %), Weight (% of portfolio). Expandable rows show individual lots with purchase dates. Action column: Edit, Close Position, Add to Watchlist.

3. **Watchlist Section** (below or tab): Similar table for tracked-but-not-held assets. Columns: Asset, Current Price, 24h Change, Your Target (low/high), Notes. Highlight when price enters target range.

4. **Performance Chart** (sidebar or toggleable): Lightweight Charts area chart showing portfolio value over time. Toggle between 1W, 1M, 3M, 6M, 1Y, All. Overlay individual asset performance.

**Data flow**: TanStack Query fetches portfolio from `/api/portfolio` which joins `holdings` with latest `price_cache` entries. Auto-refetch every 60 seconds. Optimistic updates on CRUD operations.

**Key interactions**: Add Holding dialog (asset search autocomplete, quantity, price, date, notes). Edit inline. Close position marks holding as closed and records exit price. CSV import for bulk data.

**Edge cases**: Handle missing prices gracefully (show last known price with "stale" indicator). Handle assets with no EUR conversion (show in original currency with warning). Handle zero-quantity holdings (display but grey out).

### 5.2 The Wire — Newsfeed (`/wire`)

**Layout**: Vertical feed, inspired by Bloomberg Terminal's news pane. Two-column on wide screens: main feed (left, 70%) and filters/summary (right, 30%).

**Feed items**: Each card shows: Source badge (color-coded by quality), Headline, 2-line summary, Timestamp (relative: "2h ago"), Sentiment pill (green/red/grey), Related asset tags, Relevance score bar (subtle).

**Filters sidebar**: Filter by: Category (checkboxes), Sentiment (bullish/bearish/neutral), Related asset (dropdown), Source quality (slider: min quality), Time range. Show "Emerging Narratives" section: Sentinel-detected narrative clusters with frequency counts.

**Real-time**: Poll `/api/news` every 5 minutes. New items appear at top with subtle animation. Unread count badge on navigation.

**Deduplication**: Stories are clustered by `clusterId`. Show only the highest-quality source per cluster, with "N more sources" expandable.

### 5.3 The Desk — Recommendations (`/desk`)

**Layout**: Card-based feed with category tabs: All, Opportunities, Risk Warnings, Rebalancing, Macro Thesis.

**Recommendation card**: Title, Agent badge (Scout/Strategist), Confidence meter (visual bar), Time horizon tag, Status pill (Active/Expired/Validated), Thesis (collapsible, first 2 lines shown), Related assets with action tags (Buy/Sell/Hold), Expand for full evidence + risk assessment.

**Historical tracking**: Toggle to show past recommendations with outcome scores. Accuracy trend chart over time.

**Interactions**: Mark as Reviewed, Dismiss, Add to Forum discussion. Filter by confidence level, time horizon, agent.

### 5.4 The Archive — Knowledge Library (`/archive`)

**Layout**: Left sidebar with domain taxonomy tree. Main content area shows entry cards or full entry view. Search bar at top with FTS5-powered instant search.

**Entry view**: Title, Domain/Subdomain breadcrumb, Summary card, Full explanation (rendered markdown), Mathematical formulation (KaTeX), Practical Application section, Limitations, Related entries (linked), Source/DOI link, Tags.

**Browse mode**: Grid of entry cards grouped by domain. Each card: title, summary, domain badge, tags.

**Search**: Full-text search across title, summary, explanation, and practical application. Results ranked by relevance.

### 5.5 The Forum — Strategic Conversation (`/forum`)

**Layout**: Classic chat interface. Left sidebar lists conversations (searchable). Main area is the chat thread. Right sidebar (optional, toggleable) shows context: current portfolio summary, recent Wire headlines, active Desk recommendations.

**Chat interface**: Message bubbles with role indicators (User/Strategist/System). Support for structured output rendering: recommendation cards, scenario tables, portfolio impact visualizations inline in chat. Code/math rendering in messages.

**Context injection**: When starting a new conversation, the system message automatically includes current portfolio state and recent agent outputs. User can select a conversation type (General, Scenario Planning, Portfolio Review, Strategy Session) which adjusts the system prompt and available context.

**Conversation types**:
- **General**: Open-ended discussion with Strategist agent
- **Scenario Planning**: Structured session with scenario templates
- **Portfolio Review**: Focused on current positions, P&L, rebalancing
- **Strategy Session**: Historical parallels, regime analysis, forward-looking

### 5.6 Settings & Agent Configuration (`/settings`)

**Sections**:
- **API Keys**: Manage Finnhub, CoinGecko, Metals.Dev, Anthropic keys. Status indicators (valid/expired/quota remaining).
- **Agent Configuration**: Per-agent toggle (on/off), schedule override, model selection, token budget limits.
- **Agent Runs History**: Table of recent runs with status, duration, token usage, cost. Drill into results.
- **Display Preferences**: Default currency, number format, chart style.
- **Data Management**: Export portfolio (CSV/JSON), backup database, import from CSV.

---

## 6. UI/UX Architecture

### 6.1 Route Structure

```
/                     → Dashboard (Portfolio)
/wire                 → The Wire (Newsfeed)
/wire/[id]            → Article detail
/desk                 → The Desk (Recommendations)
/desk/[id]            → Recommendation detail
/archive              → The Archive (Knowledge Library)
/archive/[slug]       → Knowledge entry
/forum                → The Forum (Conversations list)
/forum/[id]           → Conversation thread
/settings             → Settings & Configuration
/settings/agents      → Agent configuration & run history
```

### 6.2 Layout & Navigation

Root layout: Fixed left sidebar navigation (collapsible to icons) + top status bar.

**Sidebar navigation items**:
- Dashboard (LayoutDashboard icon)
- The Wire (Newspaper icon) — with unread badge
- The Desk (Lightbulb icon) — with active count badge
- The Archive (Library icon)
- The Forum (MessageSquare icon)
- Settings (Settings icon)

**Top status bar**: Portfolio total value, 24h change, market status (open/closed for major exchanges), last data refresh timestamp, agent status indicators (green/yellow/red dots).

### 6.3 Component Library (shadcn/ui)

Core components to install and customize:

```bash
npx shadcn@latest add button card dialog dropdown-menu input label
npx shadcn@latest add select separator sheet sidebar skeleton
npx shadcn@latest add table tabs textarea toast tooltip badge
npx shadcn@latest add command popover scroll-area collapsible
```

Additional dependencies:
```bash
npm install lightweight-charts recharts @tanstack/react-table
npm install @tanstack/react-query zustand
npm install lucide-react                    # Icons
npm install katex react-katex              # Math rendering
npm install react-markdown remark-gfm      # Markdown in Forum/Archive
npm install date-fns                       # Date formatting
```

### 6.4 Theme

Dark mode as default. Financial tool aesthetic: deep navy/charcoal backgrounds, high-contrast text, accent colors for positive (emerald green) and negative (red-500) values.

```typescript
// tailwind.config.ts — extend the default shadcn dark theme
{
  theme: {
    extend: {
      colors: {
        gain: '#10b981',      // Emerald 500 — positive P&L
        loss: '#ef4444',      // Red 500 — negative P&L
        neutral: '#6b7280',   // Gray 500 — flat
        accent: '#3b82f6',    // Blue 500 — primary accent
      }
    }
  }
}
```

### 6.5 State Management Details

```typescript
// src/stores/ui-store.ts
import { create } from 'zustand';

interface UIState {
  sidebarCollapsed: boolean;
  activeWireFilters: {
    categories: string[];
    minQuality: number;
    sentiment: string | null;
    assetId: string | null;
  };
  activeDeskTab: string;
  forumContextVisible: boolean;
  // Actions
  toggleSidebar: () => void;
  setWireFilters: (filters: Partial<UIState['activeWireFilters']>) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  activeWireFilters: { categories: [], minQuality: 5, sentiment: null, assetId: null },
  activeDeskTab: 'all',
  forumContextVisible: true,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setWireFilters: (filters) => set((s) => ({ activeWireFilters: { ...s.activeWireFilters, ...filters } })),
}));
```

TanStack Query handles all server data. Key query patterns:

```typescript
// src/hooks/use-portfolio.ts
export function usePortfolio() {
  return useQuery({
    queryKey: ['portfolio'],
    queryFn: () => fetch('/api/portfolio').then(r => r.json()),
    refetchInterval: 60_000,  // 60 seconds
  });
}

export function useWireNews(filters: WireFilters) {
  return useInfiniteQuery({
    queryKey: ['wire', filters],
    queryFn: ({ pageParam }) => fetch(`/api/news?cursor=${pageParam}&...`).then(r => r.json()),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    refetchInterval: 300_000,  // 5 minutes
  });
}
```

---

## 7. Knowledge Library Schema

### 7.1 Taxonomy

```
financial_math/
  ├── pricing_models       (Black-Scholes, binomial, Monte Carlo)
  ├── portfolio_theory      (CAPM, APT, Fama-French, efficient frontier)
  ├── risk_metrics          (VaR, CVaR, Sharpe, Sortino, maximum drawdown)
  └── position_sizing       (Kelly criterion, fractional Kelly, risk parity)

behavioral_econ/
  ├── cognitive_biases      (anchoring, confirmation bias, availability heuristic)
  ├── decision_theory       (prospect theory, loss aversion, framing effects)
  └── market_behavior       (herding, momentum, mean reversion, disposition effect)

macro/
  ├── monetary_policy       (Taylor rule, quantity theory, IS-LM, Mundell-Fleming)
  ├── yield_curve           (term structure, inversion signals, carry trade)
  ├── business_cycle        (Kondratiev waves, credit cycles, Minsky moment)
  └── international         (impossible trinity, balance of payments, currency crises)

futures_studies/
  ├── methods               (scenario planning, Delphi, cross-impact analysis, CLA)
  ├── frameworks            (three horizons, cone of plausibility, wind-tunneling)
  └── anticipatory_governance

game_theory/
  ├── equilibria            (Nash, Bayesian, correlated equilibrium)
  ├── mechanism_design      (auction theory, market microstructure)
  └── evolutionary          (replicator dynamics, ESS, cooperation models)

complexity/
  ├── power_laws            (fat tails, Pareto, Zipf, scale-free networks)
  ├── emergence             (self-organization, phase transitions, criticality)
  └── network_theory        (contagion, centrality, small-world networks)
```

### 7.2 Seed Content (30 Foundational Entries)

Each entry should be pre-populated with full content on first database seed.

**Financial Mathematics**:
1. Black-Scholes-Merton Model — Options pricing, geometric Brownian motion, the Greeks
2. Capital Asset Pricing Model (CAPM) — Expected returns via beta and market risk premium
3. Fama-French Three-Factor Model — Size and value factors beyond market risk
4. Kelly Criterion — Optimal bet sizing for long-term geometric growth
5. Monte Carlo Simulation — Stochastic modeling for portfolio outcomes
6. Modern Portfolio Theory (Markowitz) — Efficient frontier, diversification mathematics
7. Value at Risk (VaR) — Quantifying downside risk at confidence levels
8. Sharpe Ratio & Risk-Adjusted Returns — Comparing strategies with different risk profiles
9. Arbitrage Pricing Theory (APT) — Multi-factor return models
10. Mean-Variance Optimization — Portfolio construction under uncertainty

**Behavioral Economics**:
11. Prospect Theory (Kahneman & Tversky) — Loss aversion, probability weighting, reference dependence
12. Anchoring Bias — Initial reference point distortion in valuation
13. Herding Behavior — Information cascades and momentum in markets
14. Disposition Effect — Tendency to sell winners too early, hold losers too long
15. Overconfidence Bias — Miscalibrated probability assessments
16. Narrative Economics (Shiller) — How stories drive economic events

**Macroeconomic Models**:
17. IS-LM Model — Goods market and money market equilibrium
18. Taylor Rule — Central bank interest rate decision framework
19. Yield Curve Analysis — Term structure as economic indicator
20. Mundell-Fleming Model — Open economy IS-LM with exchange rates
21. Minsky's Financial Instability Hypothesis — Stability breeds instability cycles

**Futures Studies**:
22. Scenario Planning (Schwartz/Shell) — Structured exploration of alternative futures
23. Delphi Method — Expert consensus through iterative surveying
24. Cross-Impact Analysis — Mapping event interdependencies
25. Causal Layered Analysis (Inayatullah) — Litany, systemic causes, worldview, myth/metaphor
26. Three Horizons Framework — Current, transitional, and emerging systems

**Game Theory**:
27. Nash Equilibrium — Stable strategy profiles in non-cooperative games
28. Mechanism Design — Designing rules to achieve desired outcomes
29. Auction Theory (Vickrey, Milgrom) — Bidding strategies and revenue equivalence

**Complexity Science**:
30. Fat Tails & Power Laws (Mandelbrot, Taleb) — Non-Gaussian distributions in financial returns

---

## 8. Build Phases

### Phase 1: Foundation (Estimated: 2-3 days)
**Scope**: Core data layer, portfolio management, price fetching.

**Deliverables**:
- Next.js 15 project scaffolded with App Router, Tailwind, shadcn/ui (dark theme)
- SQLite database with Drizzle ORM, all schema tables, migrations
- Price service implementation (Finnhub, CoinGecko, Metals.Dev, ECB rates)
- Rate limiter and caching layer
- Portfolio CRUD (add/edit/close holdings, manage watchlist)
- Dashboard page: portfolio summary, holdings table, basic performance chart
- Settings page: API key management

**Dependencies**: Finnhub, CoinGecko, Metals.Dev API keys. Anthropic API key (for later phases, but configure now).

**Definition of done**: User can add holdings across all three asset classes, see real-time EUR valuations, and view portfolio performance.

### Phase 2: The Wire + Sentinel (Estimated: 2-3 days)
**Scope**: News aggregation, Sentinel agent, newsfeed UI.

**Deliverables**:
- News service: Finnhub news fetching, RSS feed parsing
- Sentinel agent: Claude API integration, news classification, sentiment tagging
- Content deduplication (hash-based + cluster-based)
- `/wire` page: filterable news feed, category sidebar, emerging narratives
- Agent scheduler (node-cron) with Sentinel schedule
- Agent runs history in settings
- FTS5 search on news

**Dependencies**: Phase 1 complete. Anthropic API key configured.

**Definition of done**: Sentinel runs on schedule, classifies incoming news, and the Wire displays a prioritized, filterable feed.

### Phase 3: The Archive + Librarian (Estimated: 2-3 days)
**Scope**: Knowledge library, Librarian agent, seed content.

**Deliverables**:
- Knowledge library data model populated with 30 seed entries
- `/archive` page: taxonomy browser, full-text search, entry detail view
- KaTeX math rendering for mathematical formulations
- Librarian agent: academic source discovery, summarization
- Cross-referencing system between entries
- FTS5 search on knowledge entries

**Dependencies**: Phase 1. Anthropic API key.

**Definition of done**: User can browse, search, and read knowledge entries. Librarian can discover and add new entries.

### Phase 4: The Desk + Scout + Strategist (Estimated: 3-4 days)
**Scope**: Recommendation system, remaining agents, recommendation tracking.

**Deliverables**:
- `/desk` page: recommendation cards, category tabs, historical accuracy view
- Scout agent: price analysis, technical indicators, opportunity detection
- Strategist agent: macro synthesis, scenario analysis
- Recommendation accuracy tracking (user marks outcomes)
- Technical indicator calculations (RSI, MACD, moving averages)
- Integration between agents (Scout reads Sentinel data, Strategist reads all)

**Dependencies**: Phases 1-3.

**Definition of done**: Scout and Strategist generate recommendations visible on The Desk. User can review and track accuracy.

### Phase 5: The Forum + Full Orchestration (Estimated: 3-4 days)
**Scope**: Conversational interface, full agent orchestration, polish.

**Deliverables**:
- `/forum` page: conversation list, chat interface, context sidebar
- Chat with Strategist agent: full context injection (portfolio, news, knowledge, recommendations)
- Structured conversation types (general, scenario planning, portfolio review)
- Message streaming (Claude API streaming for real-time response display)
- Inline rendering of recommendation cards and data visualizations in chat
- Cross-feature linking: click asset in chat to go to portfolio, click article reference to go to Wire
- FTS5 search on conversations
- Full agent orchestration: all four agents running on schedule with proper inter-agent data flow

**Dependencies**: All previous phases.

**Definition of done**: User can have strategic conversations with full system context. All agents run autonomously and feed their respective interfaces.

---

## 9. Configuration & Environment

### 9.1 Environment Variables

```env
# .env.local

# === API Keys ===
FINNHUB_API_KEY=your_finnhub_key
COINGECKO_API_KEY=your_coingecko_demo_key
METALS_DEV_API_KEY=your_metals_dev_key
GOLDAPI_KEY=your_goldapi_key                    # Fallback metals
ANTHROPIC_API_KEY=your_anthropic_api_key

# === Database ===
DATABASE_URL=file:./data/meridian.db            # SQLite file path
DATABASE_WAL=true                                # Enable WAL journal mode

# === Agent Configuration ===
AGENT_ENABLED=true                               # Master kill switch
AGENT_SENTINEL_ENABLED=true
AGENT_SENTINEL_CRON=*/15 * * * *                 # Every 15 minutes (cost-optimized)
AGENT_SCOUT_ENABLED=true
AGENT_SCOUT_CRON=0 */4 * * *
AGENT_LIBRARIAN_ENABLED=true
AGENT_LIBRARIAN_CRON=0 2 * * 1
AGENT_STRATEGIST_ENABLED=true
AGENT_STRATEGIST_CRON=0 8 * * 1-5

# === Model Selection ===
CLAUDE_MODEL_ROUTINE=claude-sonnet-4-5-20250929
CLAUDE_MODEL_DEEP=claude-opus-4-5-20251101

# === Token Budgets (per run) ===
AGENT_SENTINEL_MAX_OUTPUT_TOKENS=2000
AGENT_SCOUT_MAX_OUTPUT_TOKENS=4000
AGENT_LIBRARIAN_MAX_OUTPUT_TOKENS=4000
AGENT_STRATEGIST_MAX_OUTPUT_TOKENS=8000
FORUM_MAX_OUTPUT_TOKENS=4096

# === Application ===
NEXT_PUBLIC_BASE_CURRENCY=EUR
NEXT_PUBLIC_TIMEZONE=Europe/Vienna
PORT=3000
```

### 9.2 API Key Acquisition Checklist

1. **Finnhub**: https://finnhub.io/register — instant, free
2. **CoinGecko**: https://www.coingecko.com/en/api — sign up for Demo plan, free
3. **Metals.Dev**: https://metals.dev/ — sign up, free plan auto-assigned
4. **GoldAPI.io**: https://www.goldapi.io/ — sign up, 100 req/month free
5. **Anthropic**: https://console.anthropic.com/ — sign up, $5 free credits, then pay-as-you-go

### 9.3 Development vs. Production

| Setting | Development | Production |
|---------|-------------|------------|
| Database | `file:./data/meridian.db` | Same (local) or Turso URL |
| Agent scheduling | Manual trigger via API | node-cron automated |
| Claude model | Sonnet for all (cost saving) | Opus for Strategist |
| Price polling | 5-minute intervals | 60-second intervals |
| Error handling | Console logging | Structured logging + alerts |
| CORS | localhost only | Same (single-user) |

---

## 10. Future Considerations

### 10.1 Phase 2 Asset Classes

**Bonds/Fixed Income**: Add `asset_class: 'bond'` with metadata for coupon rate, maturity date, credit rating. Price via Finnhub or dedicated bond API (BondCliQ, FINRA TRACE). Yield calculations and duration in the Archive.

**ETFs**: Handled as stocks (same APIs, same schema). Add metadata for expense ratio, underlying index, and holdings breakdown.

**Real Estate (REITs)**: Handled as stocks. Add metadata for property type, geographic focus, FFO metrics.

**Options**: Significantly more complex. Requires options chain data (Finnhub premium or CBOE). Extend schema for strike price, expiration, option type. Black-Scholes in the Archive becomes directly applicable. Phase 3+ consideration.

### 10.2 Deployment Options

**Vercel**: Natural fit for Next.js. Free tier handles the UI. Edge functions for API routes. Challenge: SQLite doesn't work on serverless — requires migration to Turso or Neon Postgres.

**Self-hosted (VPS)**: Hetzner Cloud (Nuremberg datacenter, EU data residency). €4.51/month for CX22 (2 vCPU, 4GB RAM). Run `next start` with PM2 process manager. SQLite works perfectly. Recommended for production.

**Tauri Desktop**: Bundle as native macOS app. Benefits: offline access, no server needed, native performance. Challenge: background agent scheduling needs rethinking (no always-on server). Evaluate after Phase 5.

### 10.3 Backup & Data Export

**Database backup**: Cron job to copy SQLite file to a backup directory (with timestamp). SQLite's `.backup` API handles this safely even while the database is in use.

**Data export**: Settings page offers CSV export for portfolio holdings, JSON export for knowledge entries, and full database download.

**Future**: Sync to iCloud Drive or a self-hosted Syncthing instance for multi-device access.

### 10.4 MCP Server Integration

Build an MCP server that exposes the Meridian database to Claude Code CLI. This enables natural-language queries against your portfolio, news, and knowledge data directly from the terminal.

**Tools to expose**:
- `get_portfolio_summary` — Current holdings, P&L, allocation
- `get_asset_price` — Latest cached price for any asset
- `search_news` — Full-text search across The Wire
- `search_knowledge` — Query The Archive
- `get_recommendations` — Active recommendations from The Desk
- `get_agent_status` — Recent agent run history

**Implementation**: Use the MCP SDK for TypeScript. The server reads from the same SQLite database. Register in Claude Code's MCP configuration.

### 10.5 Multi-Device Sync

Short-term: Not needed (single-user, single machine).

Medium-term: Turso (libSQL) provides SQLite-compatible edge replication. Migrate the database to Turso, and the app works from any device pointing at the same Turso instance.

Long-term: CRDTs for offline-first sync if building a mobile companion app.

---

## Appendix A: Package Dependencies

```json
{
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@anthropic-ai/sdk": "^0.39.0",
    "@tanstack/react-query": "^5.0.0",
    "@tanstack/react-table": "^8.0.0",
    "better-sqlite3": "^11.0.0",
    "drizzle-orm": "^0.36.0",
    "zustand": "^5.0.0",
    "node-cron": "^3.0.0",
    "lightweight-charts": "^4.0.0",
    "recharts": "^2.0.0",
    "lucide-react": "^0.460.0",
    "katex": "^0.16.0",
    "react-katex": "^3.0.0",
    "react-markdown": "^9.0.0",
    "remark-gfm": "^4.0.0",
    "date-fns": "^4.0.0",
    "uuid": "^11.0.0",
    "rss-parser": "^3.0.0",
    "tailwindcss": "^4.0.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "drizzle-kit": "^0.28.0",
    "@types/better-sqlite3": "^7.0.0",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0"
  }
}
```

---

*End of Technical Specification — MERIDIAN v1.0*
*Document generated: February 2026*
*Ready for implementation by Claude Code CLI*
