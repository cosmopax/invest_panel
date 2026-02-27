import Parser from "rss-parser";
import * as finnhub from "./finnhub";
import { getDb } from "@/lib/db";
import { newsItems, assets, holdings, watchlist } from "@/lib/db/schema";
import { contentHash, clusterKey } from "@/lib/utils/dedup";
import { newId } from "@/lib/utils/id";
import { eq, inArray, desc } from "drizzle-orm";

const rssParser = new Parser({
  timeout: 10000,
  headers: {
    "User-Agent": "MERIDIAN/1.0 (Investment Research)",
  },
});

/** RSS feed configuration — quality-ranked. */
export const RSS_FEEDS = [
  { url: "https://www.ecb.europa.eu/rss/press.html", source: "ECB Press", quality: 10 },
  { url: "https://www.bis.org/doclist/bis_fsi.rss", source: "BIS", quality: 10 },
  { url: "https://feeds.reuters.com/reuters/businessNews", source: "Reuters Business", quality: 9 },
  { url: "https://feeds.bbci.co.uk/news/business/rss.xml", source: "BBC Business", quality: 7 },
  { url: "https://rss.nytimes.com/services/xml/rss/nyt/Business.xml", source: "NYT Business", quality: 7 },
  { url: "https://feeds.marketwatch.com/marketwatch/topstories/", source: "MarketWatch", quality: 6 },
] as const;

/** Raw news item from any source before processing. */
export interface RawNewsItem {
  externalId?: string;
  title: string;
  summary?: string;
  content?: string;
  url: string;
  source: string;
  sourceQuality: number;
  publishedAt: string; // ISO datetime
}

/** Fetch market news from Finnhub. */
async function fetchFinnhubMarketNews(): Promise<RawNewsItem[]> {
  try {
    const items = await finnhub.getMarketNews("general");
    return items.map((item) => ({
      externalId: String(item.id),
      title: item.headline,
      summary: item.summary,
      url: item.url,
      source: item.source || "Finnhub",
      sourceQuality: 6,
      publishedAt: new Date(item.datetime * 1000).toISOString(),
    }));
  } catch {
    console.error("[NewsService] Finnhub market news fetch failed");
    return [];
  }
}

/** Fetch company-specific news for portfolio assets from Finnhub. */
async function fetchFinnhubCompanyNews(symbols: string[]): Promise<RawNewsItem[]> {
  const results: RawNewsItem[] = [];
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const from = weekAgo.toISOString().slice(0, 10);
  const to = now.toISOString().slice(0, 10);

  for (const symbol of symbols.slice(0, 10)) {
    try {
      const items = await finnhub.getCompanyNews(symbol, from, to);
      results.push(
        ...items.slice(0, 5).map((item) => ({
          externalId: String(item.id),
          title: item.headline,
          summary: item.summary,
          url: item.url,
          source: item.source || "Finnhub",
          sourceQuality: 7,
          publishedAt: new Date(item.datetime * 1000).toISOString(),
        })),
      );
    } catch {
      console.error(`[NewsService] Finnhub company news failed for ${symbol}`);
    }
  }

  return results;
}

/** Fetch news from RSS feeds. */
async function fetchRSSFeeds(): Promise<RawNewsItem[]> {
  const results: RawNewsItem[] = [];

  const fetchPromises = RSS_FEEDS.map(async (feed) => {
    try {
      const parsed = await rssParser.parseURL(feed.url);
      return (parsed.items || []).slice(0, 10).map((item) => ({
        externalId: item.guid || item.link,
        title: item.title || "Untitled",
        summary: item.contentSnippet || item.content?.slice(0, 500),
        content: item.content,
        url: item.link || feed.url,
        source: feed.source,
        sourceQuality: feed.quality,
        publishedAt: item.isoDate || item.pubDate || new Date().toISOString(),
      }));
    } catch {
      console.error(`[NewsService] RSS fetch failed: ${feed.source}`);
      return [];
    }
  });

  const feedResults = await Promise.allSettled(fetchPromises);
  for (const result of feedResults) {
    if (result.status === "fulfilled") {
      results.push(...result.value);
    }
  }

  return results;
}

/** Get portfolio stock symbols for company news. */
async function getPortfolioStockSymbols(): Promise<string[]> {
  const db = getDb();
  const rows = await db
    .select({ symbol: assets.symbol })
    .from(holdings)
    .innerJoin(assets, eq(holdings.assetId, assets.id))
    .where(eq(assets.assetClass, "stock"));

  return [...new Set(rows.map((r) => r.symbol))];
}

/** Get all tracked asset symbols (portfolio + watchlist). */
export async function getTrackedAssets(): Promise<
  Array<{ id: string; symbol: string; name: string; assetClass: string }>
> {
  const db = getDb();

  const portfolioAssets = await db
    .select({
      id: assets.id,
      symbol: assets.symbol,
      name: assets.name,
      assetClass: assets.assetClass,
    })
    .from(holdings)
    .innerJoin(assets, eq(holdings.assetId, assets.id))
    .where(eq(holdings.isClosed, false));

  const watchlistAssets = await db
    .select({
      id: assets.id,
      symbol: assets.symbol,
      name: assets.name,
      assetClass: assets.assetClass,
    })
    .from(watchlist)
    .innerJoin(assets, eq(watchlist.assetId, assets.id));

  const seen = new Set<string>();
  const result: typeof portfolioAssets = [];
  for (const a of [...portfolioAssets, ...watchlistAssets]) {
    if (!seen.has(a.id)) {
      seen.add(a.id);
      result.push(a);
    }
  }
  return result;
}

/**
 * Fetch all news from all sources, deduplicate, and return raw items
 * that are NOT already in the database.
 */
export async function fetchAllNews(): Promise<RawNewsItem[]> {
  const stockSymbols = await getPortfolioStockSymbols();

  const [marketNews, companyNews, rssNews] = await Promise.all([
    fetchFinnhubMarketNews(),
    fetchFinnhubCompanyNews(stockSymbols),
    fetchRSSFeeds(),
  ]);

  const allItems = [...marketNews, ...companyNews, ...rssNews];

  // Deduplicate by content hash
  const db = getDb();
  const newItems: RawNewsItem[] = [];
  const seenHashes = new Set<string>();

  for (const item of allItems) {
    const hash = contentHash(item.title, item.summary);
    if (seenHashes.has(hash)) continue;
    seenHashes.add(hash);

    // Check DB for existing hash
    const existing = await db
      .select({ id: newsItems.id })
      .from(newsItems)
      .where(eq(newsItems.contentHash, hash))
      .limit(1);

    if (existing.length === 0) {
      newItems.push(item);
    }
  }

  return newItems;
}

/**
 * Persist classified news items to the database.
 * Called by Sentinel after Claude API classification.
 */
export async function persistNewsItems(
  items: Array<
    RawNewsItem & {
      category?: string;
      relevanceScore?: number;
      sentiment?: string;
      sentimentScore?: number;
      sentimentAssets?: Record<string, { sentiment: string; score: number }>;
      narrativeTag?: string;
    }
  >,
): Promise<number> {
  const db = getDb();
  let inserted = 0;

  for (const item of items) {
    const hash = contentHash(item.title, item.summary);
    const cluster = clusterKey(item.title);

    try {
      await db.insert(newsItems).values({
        id: newId(),
        externalId: item.externalId || null,
        title: item.title,
        summary: item.summary || null,
        content: item.content || null,
        url: item.url,
        source: item.source,
        sourceQuality: item.sourceQuality,
        publishedAt: item.publishedAt,
        category: item.category || null,
        relatedAssets: item.sentimentAssets
          ? Object.keys(item.sentimentAssets)
          : null,
        relevanceScore: item.relevanceScore ?? null,
        sentiment: item.sentiment || null,
        sentimentScore: item.sentimentScore ?? null,
        sentimentAssets: item.sentimentAssets || null,
        contentHash: hash,
        clusterId: cluster,
        decayScore: item.relevanceScore ?? 0.5,
      });
      inserted++;
    } catch (error) {
      // Unique constraint on content_hash — skip duplicates silently
      if (
        error instanceof Error &&
        error.message.includes("UNIQUE constraint")
      ) {
        continue;
      }
      console.error("[NewsService] Insert failed:", error);
    }
  }

  return inserted;
}

/** Get news items from the database with optional filters. */
export async function getNewsFromDb(options: {
  limit?: number;
  offset?: number;
  category?: string;
  sentiment?: string;
  minQuality?: number;
}) {
  const db = getDb();
  const { limit = 50, offset = 0 } = options;

  // Build query with raw SQL for flexible filtering
  const sqlite = (await import("@/lib/db")).getSqlite();
  const params: (string | number)[] = [];
  let where = "WHERE 1=1";

  if (options.category) {
    where += " AND category = ?";
    params.push(options.category);
  }
  if (options.sentiment) {
    where += " AND sentiment = ?";
    params.push(options.sentiment);
  }
  if (options.minQuality) {
    where += " AND source_quality >= ?";
    params.push(options.minQuality);
  }

  const rows = sqlite
    .prepare(
      `SELECT * FROM news_items ${where} ORDER BY published_at DESC LIMIT ? OFFSET ?`,
    )
    .all(...params, limit, offset);

  return rows;
}

/** Search news using FTS5. */
export function searchNews(query: string, limit = 20) {
  const sqlite = (require("@/lib/db") as { getSqlite: () => import("better-sqlite3").Database }).getSqlite();

  return sqlite
    .prepare(
      `SELECT n.*, highlight(news_fts, 0, '<mark>', '</mark>') as highlighted_title
       FROM news_fts f
       JOIN news_items n ON n.rowid = f.rowid
       WHERE news_fts MATCH ?
       ORDER BY rank
       LIMIT ?`,
    )
    .all(query, limit);
}
