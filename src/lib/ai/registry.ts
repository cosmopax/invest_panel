import type {
  ProviderType,
  HealthCheckResult,
  FallbackChain,
} from "./types";
import { BaseAIProvider } from "./base-provider";
import { ClaudeProvider } from "./providers/claude";
import { GeminiProvider } from "./providers/gemini";
import { CodexProvider } from "./providers/codex";

/** Cached health check with TTL. */
interface CachedHealth {
  result: HealthCheckResult;
  expiresAt: number;
}

/** Health check cache TTL: 5 minutes. */
const HEALTH_CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Singleton registry for AI providers.
 * Manages instances, health checks, and fallback selection.
 */
class ProviderRegistryImpl {
  private providers: Map<ProviderType, BaseAIProvider> = new Map();
  private healthCache: Map<ProviderType, CachedHealth> = new Map();

  constructor() {
    this.providers.set("claude", new ClaudeProvider());
    this.providers.set("gemini", new GeminiProvider());
    this.providers.set("codex", new CodexProvider());
  }

  /** Get a provider instance by type. */
  get(type: ProviderType): BaseAIProvider {
    const provider = this.providers.get(type);
    if (!provider) {
      throw new Error(`Unknown provider: ${type}`);
    }
    return provider;
  }

  /** Get all registered provider types. */
  getAllTypes(): ProviderType[] {
    return [...this.providers.keys()];
  }

  /**
   * Check health of a specific provider (with caching).
   */
  async checkHealth(type: ProviderType): Promise<HealthCheckResult> {
    const cached = this.healthCache.get(type);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.result;
    }

    const provider = this.get(type);
    const result = await provider.healthCheck();

    this.healthCache.set(type, {
      result,
      expiresAt: Date.now() + HEALTH_CACHE_TTL_MS,
    });

    return result;
  }

  /** Check health of all providers in parallel. */
  async checkAllHealth(): Promise<HealthCheckResult[]> {
    const types = this.getAllTypes();
    return Promise.all(types.map((t) => this.checkHealth(t)));
  }

  /**
   * Select the best available provider from a fallback chain.
   * Tries primary first, then fallbacks in order.
   * Returns the first available provider.
   */
  async selectProvider(chain: FallbackChain): Promise<{
    provider: BaseAIProvider;
    type: ProviderType;
    wasFallback: boolean;
    originalProvider?: ProviderType;
  }> {
    // Try primary
    const primaryHealth = await this.checkHealth(chain.primary);
    if (primaryHealth.status === "available") {
      return {
        provider: this.get(chain.primary),
        type: chain.primary,
        wasFallback: false,
      };
    }

    // Try fallbacks
    for (const fallbackType of chain.fallbacks) {
      const health = await this.checkHealth(fallbackType);
      if (health.status === "available") {
        console.log(
          `[Registry] ${chain.primary} unavailable, falling back to ${fallbackType}`,
        );
        return {
          provider: this.get(fallbackType),
          type: fallbackType,
          wasFallback: true,
          originalProvider: chain.primary,
        };
      }
    }

    // All unavailable — try primary anyway (it might work despite health check)
    console.warn(
      `[Registry] All providers in chain unavailable, forcing ${chain.primary}`,
    );
    return {
      provider: this.get(chain.primary),
      type: chain.primary,
      wasFallback: false,
    };
  }

  /**
   * Get providers for cross-verification (exclude the primary).
   */
  getVerifiers(
    exclude: ProviderType,
    count: number,
  ): BaseAIProvider[] {
    const types = this.getAllTypes().filter((t) => t !== exclude);
    return types.slice(0, count).map((t) => this.get(t));
  }

  /** Invalidate health cache for a specific provider. */
  invalidateHealth(type: ProviderType): void {
    this.healthCache.delete(type);
  }

  /** Invalidate all health caches. */
  invalidateAllHealth(): void {
    this.healthCache.clear();
  }
}

/** Singleton provider registry instance. */
export const ProviderRegistry = new ProviderRegistryImpl();
