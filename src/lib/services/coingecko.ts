import { rateLimiters, withRetry } from "@/lib/utils/rate-limiter";

// Demo key uses pro-api endpoint with header auth
const CG_BASE = "https://api.coingecko.com/api/v3";
const CG_PRO_BASE = "https://pro-api.coingecko.com/api/v3";

/** Price map from /simple/price. */
export interface CoinGeckoSimplePrice {
  [coinId: string]: {
    eur: number;
    eur_24h_change?: number;
    eur_24h_vol?: number;
    eur_market_cap?: number;
    last_updated_at?: number;
  };
}

/** Market data entry from /coins/markets. */
export interface CoinGeckoMarket {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  market_cap: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  sparkline_in_7d?: { price: number[] };
}

/** OHLC data point: [timestamp, open, high, low, close]. */
export type CoinGeckoOHLC = [number, number, number, number, number];

/** Market chart data from /coins/{id}/market_chart. */
export interface CoinGeckoMarketChart {
  prices: [number, number][];
  market_caps: [number, number][];
  total_volumes: [number, number][];
}

function getApiKey(): string | null {
  return process.env.COINGECKO_API_KEY || null;
}

async function cgFetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  await rateLimiters.coingecko.acquire();

  const apiKey = getApiKey();
  const baseUrl = apiKey ? CG_PRO_BASE : CG_BASE;
  const url = new URL(`${baseUrl}${endpoint}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const headers: Record<string, string> = { Accept: "application/json" };
  if (apiKey) {
    headers["x-cg-demo-api-key"] = apiKey;
  }

  return withRetry(async () => {
    const res = await fetch(url.toString(), { headers });
    if (!res.ok) {
      const err = new Error(`CoinGecko ${endpoint}: ${res.status} ${res.statusText}`) as Error & { status: number };
      err.status = res.status;
      throw err;
    }
    return res.json() as Promise<T>;
  });
}

/**
 * Get prices for multiple coins in one call (most efficient).
 * Up to 250 IDs per request.
 */
export async function getSimplePrice(
  ids: string[],
  vsCurrencies: string[] = ["eur"],
): Promise<CoinGeckoSimplePrice> {
  return cgFetch<CoinGeckoSimplePrice>("/simple/price", {
    ids: ids.join(","),
    vs_currencies: vsCurrencies.join(","),
    include_24hr_change: "true",
    include_24hr_vol: "true",
    include_market_cap: "true",
    include_last_updated_at: "true",
  });
}

/** Get market data with optional sparkline. */
export async function getMarkets(params: {
  ids?: string;
  perPage?: number;
  page?: number;
  sparkline?: boolean;
}): Promise<CoinGeckoMarket[]> {
  const queryParams: Record<string, string> = {
    vs_currency: "eur",
    order: "market_cap_desc",
    per_page: (params.perPage || 50).toString(),
    page: (params.page || 1).toString(),
  };
  if (params.ids) queryParams.ids = params.ids;
  if (params.sparkline) queryParams.sparkline = "true";

  return cgFetch<CoinGeckoMarket[]>("/coins/markets", queryParams);
}

/** Get historical OHLC data. Days: 1/7/14/30/90/180/365. */
export async function getOHLC(
  id: string,
  days: number,
): Promise<CoinGeckoOHLC[]> {
  return cgFetch<CoinGeckoOHLC[]>(`/coins/${id}/ohlc`, {
    vs_currency: "eur",
    days: days.toString(),
  });
}

/** Get historical market chart (prices, market caps, volumes). */
export async function getMarketChart(
  id: string,
  days: number,
): Promise<CoinGeckoMarketChart> {
  return cgFetch<CoinGeckoMarketChart>(`/coins/${id}/market_chart`, {
    vs_currency: "eur",
    days: days.toString(),
  });
}

/** Search for coins by query string. */
export async function searchCoins(query: string): Promise<{
  coins: Array<{ id: string; name: string; symbol: string; market_cap_rank: number | null }>;
}> {
  return cgFetch("/search", { query });
}
