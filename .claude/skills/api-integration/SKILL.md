---
name: api-integration
description: 'Rate-limited API client patterns with cache-first strategy, retry logic, and EUR conversion for MERIDIAN. Use this skill whenever building or modifying API clients for Finnhub, CoinGecko, Metals.Dev, ECB, GoldAPI, or the unified PriceService. Also use when implementing rate limiting, caching, or error handling for any external API.'
---

# API Integration Patterns for MERIDIAN

## Client Architecture

Each API client follows this pattern:

```typescript
// src/lib/services/finnhub.ts
export class FinnhubClient {
  private rateLimiter: TokenBucket;
  private baseUrl = "https://finnhub.io/api/v1";

  constructor(private apiKey: string) {
    this.rateLimiter = new TokenBucket({ capacity: 60, refillRate: 60 }); // 60 req/min
  }

  async getQuote(symbol: string): Promise<StockQuote> {
    await this.rateLimiter.acquire();
    const res = await fetchWithRetry(`${this.baseUrl}/quote?symbol=${symbol}&token=${this.apiKey}`);
    return stockQuoteSchema.parse(res);
  }
}
```

## Cache-First Strategy

All prices go through PriceService which checks cache before network:

```typescript
async getPrice(symbol: string, assetType: AssetType): Promise<PriceResult> {
  // 1. Check cache
  const cached = await this.getCached(symbol);
  if (cached && !this.isExpired(cached, this.getTTL(assetType))) {
    return cached;
  }
  // 2. Fetch from API
  try {
    const fresh = await this.fetchFromProvider(symbol, assetType);
    await this.cachePrice(fresh);
    return fresh;
  } catch (error) {
    // 3. Return stale cache as fallback
    if (cached) return { ...cached, stale: true };
    throw error;
  }
}
```

TTLs: Stocks 60s (market hours) / 5min (off-hours), Crypto 60s, Metals 15min, FX 12h.

## Rate Limiter (Token Bucket)

```typescript
export class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(private config: { capacity: number; refillRate: number }) {
    this.tokens = config.capacity;
    this.lastRefill = Date.now();
  }

  async acquire(): Promise<void> {
    this.refill();
    if (this.tokens < 1) {
      const waitMs = ((1 - this.tokens) / this.config.refillRate) * 60000;
      await new Promise(resolve => setTimeout(resolve, waitMs));
      this.refill();
    }
    this.tokens -= 1;
  }
}
```

## Retry with Exponential Backoff

```typescript
async function fetchWithRetry(url: string, attempts = 3): Promise<unknown> {
  for (let i = 0; i < attempts; i++) {
    const res = await fetch(url);
    if (res.ok) return res.json();
    if (res.status === 429 || res.status >= 500) {
      await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
      continue;
    }
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  throw new Error(`Failed after ${attempts} attempts`);
}
```

## EUR Conversion

All prices stored dual: original currency + EUR. ECB rates cached 12h, fetched daily at 16:30 CET.

```typescript
const eurPrice = originalPrice * (1 / ecbRate); // ECB rates are EUR-based (1 EUR = X foreign)
```

## Zod Validation

Every API response validated with Zod schemas before use:

```typescript
const stockQuoteSchema = z.object({
  c: z.number(), // current price
  h: z.number(), // high
  l: z.number(), // low
  o: z.number(), // open
  pc: z.number(), // previous close
  t: z.number(), // timestamp
});
```
