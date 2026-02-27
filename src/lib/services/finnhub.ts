import { rateLimiters, withRetry } from "@/lib/utils/rate-limiter";

const FINNHUB_BASE = "https://finnhub.io/api/v1";

/** Finnhub quote response. */
export interface FinnhubQuote {
  c: number; // Current price
  d: number; // Change
  dp: number; // Percent change
  h: number; // High of day
  l: number; // Low of day
  o: number; // Open
  pc: number; // Previous close
  t: number; // Timestamp
}

/** Finnhub candle response. */
export interface FinnhubCandles {
  c: number[];
  h: number[];
  l: number[];
  o: number[];
  v: number[];
  t: number[];
  s: string; // "ok" | "no_data"
}

/** Finnhub company profile. */
export interface FinnhubProfile {
  country: string;
  currency: string;
  exchange: string;
  finnhubIndustry: string;
  ipo: string;
  name: string;
  ticker: string;
  weburl: string;
  marketCapitalization: number;
}

/** Finnhub news item. */
export interface FinnhubNews {
  category: string;
  datetime: number;
  headline: string;
  id: number;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
}

/** Finnhub symbol search result. */
export interface FinnhubSearchResult {
  count: number;
  result: Array<{
    description: string;
    displaySymbol: string;
    symbol: string;
    type: string;
  }>;
}

function getApiKey(): string {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) throw new Error("FINNHUB_API_KEY not configured");
  return key;
}

async function finnhubFetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  await rateLimiters.finnhub.acquire();

  const url = new URL(`${FINNHUB_BASE}${endpoint}`);
  url.searchParams.set("token", getApiKey());
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  return withRetry(async () => {
    const res = await fetch(url.toString());
    if (!res.ok) {
      const err = new Error(`Finnhub ${endpoint}: ${res.status} ${res.statusText}`) as Error & { status: number };
      err.status = res.status;
      throw err;
    }
    return res.json() as Promise<T>;
  });
}

/** Get real-time quote for a stock symbol. */
export async function getQuote(symbol: string): Promise<FinnhubQuote> {
  return finnhubFetch<FinnhubQuote>("/quote", { symbol });
}

/** Get historical candles (OHLCV). */
export async function getCandles(
  symbol: string,
  resolution: "1" | "5" | "15" | "30" | "60" | "D" | "W" | "M",
  from: number,
  to: number,
): Promise<FinnhubCandles> {
  return finnhubFetch<FinnhubCandles>("/stock/candle", {
    symbol,
    resolution,
    from: from.toString(),
    to: to.toString(),
  });
}

/** Get company profile. */
export async function getProfile(symbol: string): Promise<FinnhubProfile> {
  return finnhubFetch<FinnhubProfile>("/stock/profile2", { symbol });
}

/** Get company news for a date range (YYYY-MM-DD). */
export async function getCompanyNews(
  symbol: string,
  from: string,
  to: string,
): Promise<FinnhubNews[]> {
  return finnhubFetch<FinnhubNews[]>("/company-news", { symbol, from, to });
}

/** Get general market news. */
export async function getMarketNews(
  category: "general" | "forex" | "crypto" | "merger" = "general",
): Promise<FinnhubNews[]> {
  return finnhubFetch<FinnhubNews[]>("/news", { category });
}

/** Search for symbols by query string. */
export async function searchSymbol(query: string): Promise<FinnhubSearchResult> {
  return finnhubFetch<FinnhubSearchResult>("/search", { q: query });
}
