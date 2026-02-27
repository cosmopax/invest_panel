import { getDb } from "@/lib/db";
import { priceCache, type Asset } from "@/lib/db/schema";
import { eq, and, desc, gte } from "drizzle-orm";
import { nanoid } from "nanoid";
import * as finnhub from "./finnhub";
import * as coingecko from "./coingecko";
import * as metalsDev from "./metals-dev";
import { getEurRate, convertToEur } from "./ecb-rates";

/** Standardized price result returned by PriceService. */
export interface PriceResult {
  assetId: string;
  symbol: string;
  priceOriginal: number;
  currency: string;
  priceEur: number;
  eurRate: number;
  change24h: number | null;
  changePercent24h: number | null;
  timestamp: string;
  source: string;
}

// Cache TTL defaults (seconds)
const CACHE_TTL = {
  stock: 60, // 1 minute
  crypto: 60, // 1 minute
  metal: 900, // 15 minutes
} as const;

/**
 * Check if a cached price is still fresh.
 */
function isCacheFresh(cachedAt: string, maxAgeSeconds: number): boolean {
  const age = (Date.now() - new Date(cachedAt).getTime()) / 1000;
  return age < maxAgeSeconds;
}

/**
 * Get cached price for an asset if fresh enough.
 */
async function getCachedPrice(
  assetId: string,
  maxAgeSeconds: number,
): Promise<PriceResult | null> {
  const db = getDb();
  const cutoff = new Date(Date.now() - maxAgeSeconds * 1000).toISOString();

  const cached = await db
    .select()
    .from(priceCache)
    .where(
      and(
        eq(priceCache.assetId, assetId),
        eq(priceCache.priceType, "spot"),
        gte(priceCache.timestamp, cutoff),
      ),
    )
    .orderBy(desc(priceCache.timestamp))
    .limit(1);

  if (cached.length === 0) return null;

  const entry = cached[0];
  return {
    assetId: entry.assetId,
    symbol: "", // Caller has this
    priceOriginal: entry.priceOriginal,
    currency: entry.currency,
    priceEur: entry.priceEur,
    eurRate: entry.eurRate,
    change24h: null,
    changePercent24h: null,
    timestamp: entry.timestamp,
    source: entry.source,
  };
}

/**
 * Persist a price result to the cache table.
 */
async function cachePrice(result: PriceResult): Promise<void> {
  const db = getDb();
  await db.insert(priceCache).values({
    id: nanoid(),
    assetId: result.assetId,
    priceType: "spot",
    priceOriginal: result.priceOriginal,
    priceEur: result.priceEur,
    currency: result.currency,
    eurRate: result.eurRate,
    timestamp: result.timestamp,
    source: result.source,
  });
}

/**
 * Fetch stock price from Finnhub, convert to EUR.
 */
async function fetchStockPrice(asset: Asset): Promise<PriceResult> {
  const quote = await finnhub.getQuote(asset.symbol);
  const eurRate = await getEurRate(asset.currency);
  const priceEur = asset.currency === "EUR" ? quote.c : quote.c / eurRate;

  return {
    assetId: asset.id,
    symbol: asset.symbol,
    priceOriginal: quote.c,
    currency: asset.currency,
    priceEur,
    eurRate,
    change24h: quote.d != null ? (asset.currency === "EUR" ? quote.d : quote.d / eurRate) : null,
    changePercent24h: quote.dp ?? null,
    timestamp: new Date().toISOString(),
    source: "finnhub",
  };
}

/**
 * Fetch crypto price from CoinGecko. Already in EUR.
 */
async function fetchCryptoPrice(asset: Asset): Promise<PriceResult> {
  const coingeckoId = (asset.metadata as Record<string, unknown>)?.coingeckoId as string || asset.symbol.toLowerCase();
  const prices = await coingecko.getSimplePrice([coingeckoId]);
  const data = prices[coingeckoId];

  if (!data) {
    throw new Error(`CoinGecko: no data for ${coingeckoId}`);
  }

  return {
    assetId: asset.id,
    symbol: asset.symbol,
    priceOriginal: data.eur,
    currency: "EUR",
    priceEur: data.eur,
    eurRate: 1,
    change24h: null,
    changePercent24h: data.eur_24h_change ?? null,
    timestamp: new Date().toISOString(),
    source: "coingecko",
  };
}

/**
 * Fetch metal price from Metals.Dev. Already in EUR/gram.
 */
async function fetchMetalPrice(asset: Asset): Promise<PriceResult> {
  const response = await metalsDev.getLatestPrices();
  const price = metalsDev.getMetalPrice(asset.symbol, response);

  if (price === null) {
    throw new Error(`Metals.Dev: no price for ${asset.symbol}`);
  }

  return {
    assetId: asset.id,
    symbol: asset.symbol,
    priceOriginal: price,
    currency: "EUR",
    priceEur: price,
    eurRate: 1,
    change24h: null,
    changePercent24h: null,
    timestamp: new Date().toISOString(),
    source: "metals_dev",
  };
}

/**
 * Get current price for an asset, using cache if fresh.
 * Delegates to the appropriate API based on asset class.
 */
export async function getPrice(
  asset: Asset,
  maxAgeSeconds?: number,
): Promise<PriceResult> {
  const ttl = maxAgeSeconds ?? CACHE_TTL[asset.assetClass as keyof typeof CACHE_TTL] ?? 60;

  // 1. Check cache
  const cached = await getCachedPrice(asset.id, ttl);
  if (cached) {
    cached.symbol = asset.symbol;
    return cached;
  }

  // 2. Fetch from API
  let result: PriceResult;
  try {
    switch (asset.assetClass) {
      case "stock":
        result = await fetchStockPrice(asset);
        break;
      case "crypto":
        result = await fetchCryptoPrice(asset);
        break;
      case "metal":
        result = await fetchMetalPrice(asset);
        break;
      default:
        throw new Error(`Unknown asset class: ${asset.assetClass}`);
    }
  } catch (error) {
    // Fallback: return stale cached data if available
    const stale = await getCachedPrice(asset.id, 86400); // 24h fallback
    if (stale) {
      stale.symbol = asset.symbol;
      return stale;
    }
    throw error;
  }

  // 3. Cache and return
  await cachePrice(result);
  return result;
}

/**
 * Batch price fetch — optimized for dashboard loading.
 * Groups assets by class and makes minimal API calls.
 */
export async function getBatchPrices(
  assets: Asset[],
): Promise<Map<string, PriceResult>> {
  const results = new Map<string, PriceResult>();
  const stocks = assets.filter((a) => a.assetClass === "stock");
  const cryptos = assets.filter((a) => a.assetClass === "crypto");
  const metals = assets.filter((a) => a.assetClass === "metal");

  // Crypto: batch via CoinGecko (single API call)
  if (cryptos.length > 0) {
    try {
      const ids = cryptos.map(
        (c) => (c.metadata as Record<string, unknown>)?.coingeckoId as string || c.symbol.toLowerCase(),
      );
      const prices = await coingecko.getSimplePrice(ids);

      for (const crypto of cryptos) {
        const cgId = (crypto.metadata as Record<string, unknown>)?.coingeckoId as string || crypto.symbol.toLowerCase();
        const data = prices[cgId];
        if (data) {
          const result: PriceResult = {
            assetId: crypto.id,
            symbol: crypto.symbol,
            priceOriginal: data.eur,
            currency: "EUR",
            priceEur: data.eur,
            eurRate: 1,
            change24h: null,
            changePercent24h: data.eur_24h_change ?? null,
            timestamp: new Date().toISOString(),
            source: "coingecko",
          };
          results.set(crypto.id, result);
          await cachePrice(result);
        }
      }
    } catch (error) {
      console.error("[PriceService] Crypto batch failed:", error);
    }
  }

  // Metals: single Metals.Dev call
  if (metals.length > 0) {
    try {
      const response = await metalsDev.getLatestPrices();
      for (const metal of metals) {
        const price = metalsDev.getMetalPrice(metal.symbol, response);
        if (price !== null) {
          const result: PriceResult = {
            assetId: metal.id,
            symbol: metal.symbol,
            priceOriginal: price,
            currency: "EUR",
            priceEur: price,
            eurRate: 1,
            change24h: null,
            changePercent24h: null,
            timestamp: new Date().toISOString(),
            source: "metals_dev",
          };
          results.set(metal.id, result);
          await cachePrice(result);
        }
      }
    } catch (error) {
      console.error("[PriceService] Metals batch failed:", error);
    }
  }

  // Stocks: individual Finnhub calls (no free batch endpoint)
  for (const stock of stocks) {
    try {
      const result = await fetchStockPrice(stock);
      results.set(stock.id, result);
      await cachePrice(result);
    } catch (error) {
      console.error(`[PriceService] Stock ${stock.symbol} failed:`, error);
    }
  }

  return results;
}
