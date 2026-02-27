/**
 * Token bucket rate limiter with request queuing.
 * Each API provider gets its own instance with appropriate limits.
 */
export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private queue: Array<{
    resolve: () => void;
    reject: (err: Error) => void;
  }> = [];
  private drainTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private maxTokens: number,
    private refillRate: number, // tokens per second
  ) {
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    const newTokens = elapsed * this.refillRate;
    this.tokens = Math.min(this.maxTokens, this.tokens + newTokens);
    this.lastRefill = now;
  }

  private drainQueue(): void {
    this.refill();
    while (this.queue.length > 0 && this.tokens >= 1) {
      this.tokens -= 1;
      const item = this.queue.shift()!;
      item.resolve();
    }
    if (this.queue.length === 0 && this.drainTimer) {
      clearInterval(this.drainTimer);
      this.drainTimer = null;
    }
  }

  /** Acquire one token. Resolves immediately if available, otherwise queues. */
  async acquire(): Promise<void> {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }
    return new Promise<void>((resolve, reject) => {
      this.queue.push({ resolve, reject });
      if (!this.drainTimer) {
        this.drainTimer = setInterval(() => this.drainQueue(), 100);
      }
    });
  }

  /** Current available tokens. */
  get available(): number {
    this.refill();
    return Math.floor(this.tokens);
  }
}

/**
 * Retry wrapper with exponential backoff.
 * Handles 429 (rate limit), 5xx (server error), and network failures.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
  } = {},
): Promise<T> {
  const { maxRetries = 3, baseDelayMs = 1000, maxDelayMs = 30000 } = options;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      if (attempt === maxRetries) throw error;

      const status =
        error instanceof Error && "status" in error
          ? (error as { status: number }).status
          : 0;
      const code =
        error instanceof Error && "code" in error
          ? (error as { code: string }).code
          : "";

      const isRetryable =
        status === 429 || status >= 500 || code === "ECONNREFUSED";
      if (!isRetryable) throw error;

      const delay = Math.min(
        baseDelayMs * Math.pow(2, attempt) + Math.random() * 1000,
        maxDelayMs,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error("Unreachable");
}

// Pre-configured limiters per API provider
export const rateLimiters = {
  finnhub: new RateLimiter(60, 1), // 60/min = 1/sec
  coingecko: new RateLimiter(30, 0.5), // 30/min = 0.5/sec
  metalsDev: new RateLimiter(5, 0.002), // ~100/month ≈ 5 burst, very slow refill
  ecb: new RateLimiter(10, 0.5), // Unlimited but be polite
};
