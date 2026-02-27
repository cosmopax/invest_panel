import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ============================================================
// PORTFOLIO & ASSETS
// ============================================================

/**
 * Asset definitions — the "what" of any holding or watchlist item.
 * One row per unique asset (e.g., AAPL, BTC, XAU).
 */
export const assets = sqliteTable(
  "assets",
  {
    id: text("id").primaryKey(),
    symbol: text("symbol").notNull(),
    name: text("name").notNull(),
    assetClass: text("asset_class").notNull(), // 'stock' | 'crypto' | 'metal'
    exchange: text("exchange"), // NYSE, NASDAQ, XETRA (stocks only)
    currency: text("currency").notNull(), // Original trading currency
    metadata: text("metadata", { mode: "json" }), // Flexible JSON
    createdAt: text("created_at").default(sql`(datetime('now'))`),
    updatedAt: text("updated_at").default(sql`(datetime('now'))`),
  },
  (table) => [
    uniqueIndex("idx_assets_symbol_class").on(table.symbol, table.assetClass),
    index("idx_assets_class").on(table.assetClass),
  ]
);

/**
 * Portfolio holdings — current positions.
 * Multiple holdings per asset allowed (different purchase lots).
 */
export const holdings = sqliteTable(
  "holdings",
  {
    id: text("id").primaryKey(),
    assetId: text("asset_id")
      .notNull()
      .references(() => assets.id),
    quantity: real("quantity").notNull(),
    costBasisPerUnit: real("cost_basis_per_unit").notNull(), // Original currency
    costBasisEur: real("cost_basis_eur").notNull(), // EUR at purchase time
    purchaseDate: text("purchase_date").notNull(), // ISO date
    notes: text("notes"),
    isClosed: integer("is_closed", { mode: "boolean" }).default(false),
    closedDate: text("closed_date"),
    closedPricePerUnit: real("closed_price_per_unit"),
    closedPriceEur: real("closed_price_eur"),
    createdAt: text("created_at").default(sql`(datetime('now'))`),
  },
  (table) => [
    index("idx_holdings_asset").on(table.assetId),
    index("idx_holdings_open").on(table.isClosed),
  ]
);

/** Watchlist — assets being tracked but not held. */
export const watchlist = sqliteTable(
  "watchlist",
  {
    id: text("id").primaryKey(),
    assetId: text("asset_id")
      .notNull()
      .references(() => assets.id),
    targetPriceLow: real("target_price_low"), // EUR alert threshold
    targetPriceHigh: real("target_price_high"), // EUR alert threshold
    notes: text("notes"),
    addedAt: text("added_at").default(sql`(datetime('now'))`),
  },
  (table) => [uniqueIndex("idx_watchlist_asset").on(table.assetId)]
);

// ============================================================
// PRICE CACHE
// ============================================================

/**
 * Cached price data — both current and historical.
 * The price service writes here; the UI reads from here.
 */
export const priceCache = sqliteTable(
  "price_cache",
  {
    id: text("id").primaryKey(),
    assetId: text("asset_id")
      .notNull()
      .references(() => assets.id),
    priceType: text("price_type").notNull(), // 'spot' | 'daily_close' | 'historical'
    priceOriginal: real("price_original").notNull(), // Native currency
    priceEur: real("price_eur").notNull(), // Converted to EUR
    currency: text("currency").notNull(), // Original currency code
    eurRate: real("eur_rate").notNull(), // EUR conversion rate used
    timestamp: text("timestamp").notNull(), // ISO datetime
    source: text("source").notNull(), // 'finnhub' | 'coingecko' | 'metals_dev' | 'ecb'
    metadata: text("metadata", { mode: "json" }), // OHLCV data, volume, etc.
  },
  (table) => [
    index("idx_price_asset_time").on(table.assetId, table.timestamp),
    index("idx_price_type").on(table.priceType),
    index("idx_price_timestamp").on(table.timestamp),
  ]
);

/** EUR exchange rates cache — from ECB. */
export const fxRates = sqliteTable(
  "fx_rates",
  {
    id: text("id").primaryKey(),
    currency: text("currency").notNull(), // USD, GBP, CHF, etc.
    rateToEur: real("rate_to_eur").notNull(), // 1 EUR = X foreign currency
    date: text("date").notNull(), // ISO date
    source: text("source").default("ecb"),
  },
  (table) => [
    uniqueIndex("idx_fx_currency_date").on(table.currency, table.date),
  ]
);

// ============================================================
// THE WIRE (Newsfeed)
// ============================================================

export const newsItems = sqliteTable(
  "news_items",
  {
    id: text("id").primaryKey(),
    externalId: text("external_id"), // Source's own ID for dedup
    title: text("title").notNull(),
    summary: text("summary"),
    content: text("content"),
    url: text("url").notNull(),
    source: text("source").notNull(),
    sourceQuality: integer("source_quality"), // 1-10
    publishedAt: text("published_at").notNull(),
    fetchedAt: text("fetched_at").default(sql`(datetime('now'))`),

    // Relevance & categorization
    category: text("category"),
    relatedAssets: text("related_assets", { mode: "json" }),
    relevanceScore: real("relevance_score"), // 0-1
    sentiment: text("sentiment"), // 'bullish' | 'bearish' | 'neutral'
    sentimentScore: real("sentiment_score"), // -1 to 1
    sentimentAssets: text("sentiment_assets", { mode: "json" }),

    // Deduplication
    contentHash: text("content_hash"), // SHA-256
    clusterId: text("cluster_id"),

    // Time decay
    decayScore: real("decay_score"),

    isRead: integer("is_read", { mode: "boolean" }).default(false),
    isBookmarked: integer("is_bookmarked", { mode: "boolean" }).default(false),
  },
  (table) => [
    index("idx_news_published").on(table.publishedAt),
    index("idx_news_category").on(table.category),
    index("idx_news_sentiment").on(table.sentiment),
    uniqueIndex("idx_news_hash").on(table.contentHash),
    index("idx_news_relevance").on(table.relevanceScore),
  ]
);

// ============================================================
// THE DESK (Recommendations)
// ============================================================

export const recommendations = sqliteTable(
  "recommendations",
  {
    id: text("id").primaryKey(),
    agentId: text("agent_id").notNull(), // 'scout' | 'strategist'
    type: text("type").notNull(), // 'opportunity' | 'risk_warning' | 'rebalance' | 'macro_thesis'

    title: text("title").notNull(),
    thesis: text("thesis").notNull(),
    evidence: text("evidence", { mode: "json" }),
    riskAssessment: text("risk_assessment").notNull(),
    confidence: real("confidence").notNull(), // 0-1
    timeHorizon: text("time_horizon").notNull(), // 'days' | 'weeks' | 'months' | 'quarters' | 'years'

    relatedAssets: text("related_assets", { mode: "json" }),

    status: text("status").default("active"), // 'active' | 'expired' | 'validated' | 'invalidated'
    outcomeNotes: text("outcome_notes"),
    accuracyScore: real("accuracy_score"),

    createdAt: text("created_at").default(sql`(datetime('now'))`),
    expiresAt: text("expires_at"),
    reviewedAt: text("reviewed_at"),
  },
  (table) => [
    index("idx_rec_type").on(table.type),
    index("idx_rec_status").on(table.status),
    index("idx_rec_confidence").on(table.confidence),
    index("idx_rec_created").on(table.createdAt),
  ]
);

// ============================================================
// THE ARCHIVE (Knowledge Library)
// ============================================================

export const knowledgeEntries = sqliteTable(
  "knowledge_entries",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    domain: text("domain").notNull(),
    subdomain: text("subdomain"),

    summary: text("summary").notNull(),
    explanation: text("explanation").notNull(), // Markdown
    mathematicalFormulation: text("math_formulation"), // LaTeX/KaTeX
    practicalApplication: text("practical_application").notNull(),
    limitations: text("limitations"),

    authors: text("authors", { mode: "json" }),
    year: integer("year"),
    sourceUrl: text("source_url"),
    doi: text("doi"),
    tags: text("tags", { mode: "json" }),
    relatedEntries: text("related_entries", { mode: "json" }),

    addedBy: text("added_by").default("system"), // 'system' | 'librarian' | 'user'
    isVerified: integer("is_verified", { mode: "boolean" }).default(false),
    qualityScore: real("quality_score"),

    createdAt: text("created_at").default(sql`(datetime('now'))`),
    updatedAt: text("updated_at").default(sql`(datetime('now'))`),
  },
  (table) => [
    uniqueIndex("idx_knowledge_slug").on(table.slug),
    index("idx_knowledge_domain").on(table.domain),
  ]
);

// ============================================================
// THE FORUM (Conversations)
// ============================================================

export const conversations = sqliteTable("conversations", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  type: text("type").default("general"), // 'general' | 'scenario_planning' | 'portfolio_review' | 'strategy_session'
  isArchived: integer("is_archived", { mode: "boolean" }).default(false),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});

export const messages = sqliteTable(
  "messages",
  {
    id: text("id").primaryKey(),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id),
    role: text("role").notNull(), // 'user' | 'assistant' | 'system'
    content: text("content").notNull(),
    agentId: text("agent_id"),
    toolCalls: text("tool_calls", { mode: "json" }),
    tokenUsage: text("token_usage", { mode: "json" }),
    createdAt: text("created_at").default(sql`(datetime('now'))`),
  },
  (table) => [
    index("idx_messages_conv").on(table.conversationId),
    index("idx_messages_created").on(table.createdAt),
  ]
);

// ============================================================
// AGENT SYSTEM
// ============================================================

export const agentRuns = sqliteTable(
  "agent_runs",
  {
    id: text("id").primaryKey(),
    agentId: text("agent_id").notNull(), // 'sentinel' | 'scout' | 'librarian' | 'strategist'
    triggerType: text("trigger_type").notNull(), // 'scheduled' | 'manual' | 'event'
    status: text("status").notNull(), // 'running' | 'completed' | 'failed' | 'cancelled'

    startedAt: text("started_at").default(sql`(datetime('now'))`),
    completedAt: text("completed_at"),
    durationMs: integer("duration_ms"),

    result: text("result", { mode: "json" }),
    error: text("error"),
    tokensInput: integer("tokens_input"),
    tokensOutput: integer("tokens_output"),
    model: text("model"),
    estimatedCostUsd: real("estimated_cost_usd"),

    config: text("config", { mode: "json" }),
  },
  (table) => [
    index("idx_runs_agent").on(table.agentId),
    index("idx_runs_status").on(table.status),
    index("idx_runs_started").on(table.startedAt),
  ]
);

// ============================================================
// SETTINGS
// ============================================================

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value", { mode: "json" }).notNull(),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});

// ============================================================
// TYPE EXPORTS
// ============================================================

export type Asset = typeof assets.$inferSelect;
export type NewAsset = typeof assets.$inferInsert;
export type Holding = typeof holdings.$inferSelect;
export type NewHolding = typeof holdings.$inferInsert;
export type WatchlistItem = typeof watchlist.$inferSelect;
export type NewsItem = typeof newsItems.$inferSelect;
export type Recommendation = typeof recommendations.$inferSelect;
export type KnowledgeEntry = typeof knowledgeEntries.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type AgentRun = typeof agentRuns.$inferSelect;
export type PriceCacheEntry = typeof priceCache.$inferSelect;
export type FxRate = typeof fxRates.$inferSelect;
export type Setting = typeof settings.$inferSelect;
