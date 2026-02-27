import { rateLimiters, withRetry } from "@/lib/utils/rate-limiter";

const METALS_BASE = "https://api.metals.dev/v1";

/** Metals.Dev latest prices response. */
export interface MetalsDevResponse {
  status: string;
  currency: string;
  unit: string;
  metals: {
    gold: number;
    silver: number;
    platinum: number;
    palladium: number;
  };
  timestamps: {
    metal: string;
    currency: string;
  };
}

/** Metal symbol to Metals.Dev key mapping. */
const METAL_MAP: Record<string, keyof MetalsDevResponse["metals"]> = {
  XAU: "gold",
  XAG: "silver",
  XPT: "platinum",
  XPD: "palladium",
};

function getApiKey(): string {
  const key = process.env.METALS_DEV_API_KEY;
  if (!key) throw new Error("METALS_DEV_API_KEY not configured");
  return key;
}

/**
 * Fetch latest metal prices in EUR per gram.
 * Single call returns all four metals — very efficient.
 */
export async function getLatestPrices(): Promise<MetalsDevResponse> {
  await rateLimiters.metalsDev.acquire();

  const url = new URL(`${METALS_BASE}/latest`);
  url.searchParams.set("api_key", getApiKey());
  url.searchParams.set("currency", "EUR");
  url.searchParams.set("unit", "gram");

  return withRetry(async () => {
    const res = await fetch(url.toString());
    if (!res.ok) {
      const err = new Error(`Metals.Dev: ${res.status} ${res.statusText}`) as Error & { status: number };
      err.status = res.status;
      throw err;
    }
    return res.json() as Promise<MetalsDevResponse>;
  });
}

/**
 * Get price for a specific metal symbol (XAU, XAG, XPT, XPD).
 * Returns EUR per gram.
 */
export function getMetalPrice(
  symbol: string,
  response: MetalsDevResponse,
): number | null {
  const key = METAL_MAP[symbol.toUpperCase()];
  if (!key) return null;
  return response.metals[key];
}

/** Get all supported metal symbols. */
export function getSupportedMetals(): string[] {
  return Object.keys(METAL_MAP);
}

/** Map a metal symbol to a human-readable name. */
export function getMetalName(symbol: string): string {
  const names: Record<string, string> = {
    XAU: "Gold",
    XAG: "Silver",
    XPT: "Platinum",
    XPD: "Palladium",
  };
  return names[symbol.toUpperCase()] || symbol;
}
