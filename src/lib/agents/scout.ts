import {
  BaseAgent,
  type AgentConfig,
  type AgentRunResult,
} from "./base-agent";
import { getDb } from "@/lib/db";
import {
  assets,
  holdings,
  watchlist,
  newsItems,
  recommendations,
} from "@/lib/db/schema";
import { eq, desc, gte } from "drizzle-orm";
import { newId } from "@/lib/utils/id";
import * as finnhub from "@/lib/services/finnhub";
import * as coingecko from "@/lib/services/coingecko";
import {
  type OHLCV,
  computeIndicators,
  summarizeIndicators,
} from "@/lib/utils/technical-indicators";
import type { AIResponse, OrchestratorTask } from "@/lib/ai/types";

/** Context gathered for a Scout run. */
interface ScoutContext {
  portfolioSummary: string;
  priceData: string;
  sentimentSummary: string;
  assetIds: string[];
}

/** A single recommendation from Scout's output. */
interface ScoutRecommendation {
  type: "opportunity" | "risk_warning" | "rebalance" | "macro_thesis";
  title: string;
  thesis: string;
  evidence: Array<{
    type: "technical" | "fundamental" | "macro" | "correlation";
    detail: string;
  }>;
  riskAssessment: string;
  confidence: number;
  timeHorizon: "days" | "weeks" | "months" | "quarters";
  relatedAssets: Array<{
    assetId: string;
    action: "buy" | "sell" | "hold" | "watch";
  }>;
}

/** Fetch OHLCV data for a stock from Finnhub (daily candles). */
async function fetchStockCandles(symbol: string, days: number): Promise<OHLCV[]> {
  const now = Math.floor(Date.now() / 1000);
  const from = now - days * 24 * 60 * 60;
  try {
    const data = await finnhub.getCandles(symbol, "D", from, now);
    if (data.s !== "ok" || !data.c?.length) return [];
    return data.c.map((_, i) => ({
      open: data.o[i],
      high: data.h[i],
      low: data.l[i],
      close: data.c[i],
      volume: data.v[i],
      timestamp: data.t[i] * 1000,
    }));
  } catch {
    return [];
  }
}

/** Fetch OHLCV data for a crypto from CoinGecko. */
async function fetchCryptoCandles(
  coingeckoId: string,
  days: number,
): Promise<OHLCV[]> {
  try {
    const data = await coingecko.getOHLC(coingeckoId, days);
    return data.map(([timestamp, open, high, low, close]) => ({
      open,
      high,
      low,
      close,
      volume: 0,
      timestamp,
    }));
  } catch {
    return [];
  }
}

/** Compute expiry date based on time horizon. */
function computeExpiry(timeHorizon: string): string {
  const now = new Date();
  switch (timeHorizon) {
    case "days":
      now.setDate(now.getDate() + 7);
      break;
    case "weeks":
      now.setDate(now.getDate() + 30);
      break;
    case "months":
      now.setMonth(now.getMonth() + 3);
      break;
    case "quarters":
      now.setFullYear(now.getFullYear() + 1);
      break;
    default:
      now.setDate(now.getDate() + 30);
  }
  return now.toISOString();
}

/** Scout agent — technical analysis, opportunity scanning. Cross-verified. */
export class ScoutAgent extends BaseAgent {
  constructor() {
    const config: AgentConfig = {
      id: "scout",
      name: "Scout",
      skillId: "analyze-technicals",
      maxTokensOutput: parseInt(
        process.env.AGENT_SCOUT_MAX_OUTPUT_TOKENS || "2000",
      ),
      schedule: process.env.AGENT_SCOUT_CRON || "0 */4 * * *",
      crossVerify: true, // Enable 1-verifier cross-verification
    };
    super(config);
  }

  async gatherContext(): Promise<ScoutContext> {
    const db = getDb();

    // 1. Get portfolio + watchlist assets
    const portfolioAssets = await db
      .select({
        id: assets.id,
        symbol: assets.symbol,
        name: assets.name,
        assetClass: assets.assetClass,
        currency: assets.currency,
        metadata: assets.metadata,
        quantity: holdings.quantity,
        costBasisEur: holdings.costBasisEur,
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
        currency: assets.currency,
        metadata: assets.metadata,
      })
      .from(watchlist)
      .innerJoin(assets, eq(watchlist.assetId, assets.id));

    // Deduplicate
    const allAssets = new Map<
      string,
      {
        id: string;
        symbol: string;
        name: string;
        assetClass: string;
        currency: string;
        metadata: unknown;
        quantity?: number;
        costBasisEur?: number;
      }
    >();
    for (const a of portfolioAssets) {
      allAssets.set(a.id, a);
    }
    for (const a of watchlistAssets) {
      if (!allAssets.has(a.id)) {
        allAssets.set(a.id, a);
      }
    }

    const assetList = [...allAssets.values()];
    const assetIds = assetList.map((a) => a.id);

    // 2. Build portfolio summary
    const portfolioSummary = assetList
      .map((a) => {
        const holding = a.quantity
          ? `, qty=${a.quantity}, cost_eur=${a.costBasisEur?.toFixed(2)}`
          : " (watchlist)";
        return `- ${a.symbol} (${a.name}, ${a.assetClass}${holding})`;
      })
      .join("\n");

    // 3. Fetch price data + technical indicators
    const priceLines: string[] = [];
    for (const asset of assetList.slice(0, 15)) {
      let candles: OHLCV[] = [];

      if (asset.assetClass === "stock") {
        candles = await fetchStockCandles(asset.symbol, 200);
      } else if (asset.assetClass === "crypto") {
        const cgId =
          (asset.metadata as Record<string, unknown>)?.coingeckoId as string ||
          asset.symbol.toLowerCase();
        candles = await fetchCryptoCandles(cgId, 200);
      }

      if (candles.length > 0) {
        const indicators = computeIndicators(candles);
        priceLines.push(summarizeIndicators(asset.symbol, indicators));
      } else {
        priceLines.push(`${asset.symbol}: no price history available`);
      }
    }
    const priceData = priceLines.join("\n\n");

    // 4. Get recent news with sentiment
    const twoDaysAgo = new Date(
      Date.now() - 2 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const recentNews = await db
      .select({
        title: newsItems.title,
        category: newsItems.category,
        sentiment: newsItems.sentiment,
        sentimentScore: newsItems.sentimentScore,
        source: newsItems.source,
      })
      .from(newsItems)
      .where(gte(newsItems.fetchedAt, twoDaysAgo))
      .orderBy(desc(newsItems.relevanceScore))
      .limit(30);

    const sentimentSummary =
      recentNews.length > 0
        ? recentNews
            .map(
              (n) =>
                `- [${n.category || "uncategorized"}] ${n.title} (${n.sentiment || "?"}, score=${n.sentimentScore ?? "?"}) via ${n.source}`,
            )
            .join("\n")
        : "No recent news data available.";

    return { portfolioSummary, priceData, sentimentSummary, assetIds };
  }

  buildTask(context: ScoutContext): OrchestratorTask {
    return {
      skillId: "analyze-technicals",
      input: {
        portfolioSummary: context.portfolioSummary,
        priceData: context.priceData,
        sentimentSummary: context.sentimentSummary,
      },
      crossVerify: true,
      verifierCount: 1,
    };
  }

  async processResponse(
    response: AIResponse,
  ): Promise<AgentRunResult & { recommendations: ScoutRecommendation[] }> {
    let recs: ScoutRecommendation[] = [];

    if (response.parsed && Array.isArray(response.parsed)) {
      recs = response.parsed as ScoutRecommendation[];
    } else {
      try {
        let jsonStr = response.text.trim();
        if (jsonStr.startsWith("```")) {
          jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
        }
        const parsed = JSON.parse(jsonStr);
        recs = Array.isArray(parsed) ? parsed : [];
      } catch {
        console.error("[Scout] Failed to parse response as JSON");
      }
    }

    return {
      itemsProcessed: recs.length,
      itemsCreated: 0,
      summary: `Generated ${recs.length} recommendations`,
      recommendations: recs,
    };
  }

  async persistResults(
    result: AgentRunResult & { recommendations?: ScoutRecommendation[] },
  ): Promise<void> {
    if (!result.recommendations?.length) return;

    const db = getDb();
    let created = 0;

    for (const rec of result.recommendations) {
      try {
        await db.insert(recommendations).values({
          id: newId(),
          agentId: "scout",
          type: rec.type,
          title: rec.title,
          thesis: rec.thesis,
          evidence: rec.evidence as unknown as Record<string, unknown>,
          riskAssessment: rec.riskAssessment,
          confidence: Math.max(0, Math.min(1, rec.confidence)),
          timeHorizon: rec.timeHorizon,
          relatedAssets: rec.relatedAssets as unknown as Record<string, unknown>,
          status: "active",
          expiresAt: computeExpiry(rec.timeHorizon),
        });
        created++;
      } catch (error) {
        console.error("[Scout] Failed to persist recommendation:", error);
      }
    }

    result.itemsCreated = created;
    result.summary = `Generated ${result.itemsProcessed} recommendations, persisted ${created}`;
  }
}

/** Create a Scout agent instance. */
export function createScout(): ScoutAgent {
  return new ScoutAgent();
}
