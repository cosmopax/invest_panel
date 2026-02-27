import { rateLimiters, withRetry } from "@/lib/utils/rate-limiter";
import { getDb } from "@/lib/db";
import { fxRates } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";

const ECB_XML_URL = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml";

/**
 * Default currencies to fetch from ECB.
 * These cover the most common trading currencies.
 */
const DEFAULT_CURRENCIES = ["USD", "GBP", "CHF", "JPY", "AUD", "CAD", "SEK", "NOK", "DKK"];

/**
 * Fetch latest EUR exchange rates from ECB daily XML feed.
 * Returns a map of currency code → rate (1 EUR = X foreign currency).
 */
export async function fetchEcbRates(
  currencies: string[] = DEFAULT_CURRENCIES,
): Promise<Map<string, number>> {
  await rateLimiters.ecb.acquire();

  return withRetry(async () => {
    const res = await fetch(ECB_XML_URL);
    if (!res.ok) {
      const err = new Error(`ECB rates: ${res.status} ${res.statusText}`) as Error & { status: number };
      err.status = res.status;
      throw err;
    }

    const xml = await res.text();
    const rates = new Map<string, number>();
    const requested = new Set(currencies.map((c) => c.toUpperCase()));

    // Parse XML with regex — ECB XML is simple and stable
    const cubeRegex = /currency='([A-Z]+)'\s+rate='([0-9.]+)'/g;
    let match;
    while ((match = cubeRegex.exec(xml)) !== null) {
      const [, currency, rateStr] = match;
      if (requested.has(currency)) {
        rates.set(currency, parseFloat(rateStr));
      }
    }

    // EUR to EUR is always 1
    rates.set("EUR", 1);

    return rates;
  });
}

/**
 * Get the EUR conversion rate for a currency.
 * Checks DB cache first (12-hour TTL), fetches from ECB if stale.
 */
export async function getEurRate(currency: string): Promise<number> {
  if (currency === "EUR") return 1;

  const db = getDb();
  const today = new Date().toISOString().split("T")[0];

  // Check cache
  const cached = await db
    .select()
    .from(fxRates)
    .where(and(eq(fxRates.currency, currency), eq(fxRates.date, today)))
    .limit(1);

  if (cached.length > 0) {
    return cached[0].rateToEur;
  }

  // Fetch fresh rates
  const rates = await fetchEcbRates();
  const rate = rates.get(currency.toUpperCase());
  if (!rate) {
    throw new Error(`No ECB rate available for ${currency}`);
  }

  // Cache all fetched rates
  for (const [curr, r] of rates.entries()) {
    if (curr === "EUR") continue;
    try {
      await db.insert(fxRates).values({
        id: nanoid(),
        currency: curr,
        rateToEur: r,
        date: today,
        source: "ecb",
      }).onConflictDoUpdate({
        target: [fxRates.currency, fxRates.date],
        set: { rateToEur: r },
      });
    } catch {
      // Ignore duplicate conflicts from concurrent inserts
    }
  }

  return rate;
}

/**
 * Convert an amount from a foreign currency to EUR.
 * Uses cached ECB rate (1 EUR = X foreign currency).
 * Formula: amount_eur = amount_foreign / rate
 */
export async function convertToEur(amount: number, currency: string): Promise<number> {
  if (currency === "EUR") return amount;
  const rate = await getEurRate(currency);
  return amount / rate;
}

/**
 * Refresh all cached rates. Call on app start and daily at 16:30 CET.
 */
export async function refreshAllRates(): Promise<Map<string, number>> {
  return fetchEcbRates();
}
