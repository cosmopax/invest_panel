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
import { eq, desc, gte, and } from "drizzle-orm";
import { newId } from "@/lib/utils/id";
import type { AIResponse, OrchestratorTask } from "@/lib/ai/types";

/** Strategist output schema. */
interface StrategistOutput {
  macroRegime: {
    current: string;
    confidence: number;
    transitionRisks: string[];
  };
  scenarios: Array<{
    name: string;
    probability: number;
    description: string;
    portfolioImpact: Record<string, string>;
    signals: string[];
  }>;
  historicalParallels: Array<{
    period: string;
    similarity: number;
    keyDifference: string;
  }>;
  assumptions: Array<{
    assumption: string;
    validity: number;
    challenge: string;
  }>;
  recommendations: Array<{
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
  }>;
  nextReview: string;
}

/** Context gathered for a Strategist run. */
interface StrategistContext {
  portfolioFull: string;
  newsDigest: string;
  activeRecs: string;
  macroData: string;
}

/** Compute expiry date for a recommendation. */
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
      now.setMonth(now.getMonth() + 3);
  }
  return now.toISOString();
}

/** Strategist agent — macro synthesis, scenario planning. Cross-verified by 2 providers. */
export class StrategistAgent extends BaseAgent {
  constructor() {
    const config: AgentConfig = {
      id: "strategist",
      name: "Strategist",
      skillId: "macro-synthesis",
      maxTokensOutput: parseInt(
        process.env.AGENT_STRATEGIST_MAX_OUTPUT_TOKENS || "4000",
      ),
      schedule: process.env.AGENT_STRATEGIST_CRON || "0 8 * * 1-5",
      crossVerify: true, // Enable 2-verifier cross-verification
    };
    super(config);
  }

  async gatherContext(): Promise<StrategistContext> {
    const db = getDb();

    // 1. Full portfolio state
    const portfolioAssets = await db
      .select({
        symbol: assets.symbol,
        name: assets.name,
        assetClass: assets.assetClass,
        currency: assets.currency,
        quantity: holdings.quantity,
        costBasisPerUnit: holdings.costBasisPerUnit,
        costBasisEur: holdings.costBasisEur,
        purchaseDate: holdings.purchaseDate,
      })
      .from(holdings)
      .innerJoin(assets, eq(holdings.assetId, assets.id))
      .where(eq(holdings.isClosed, false));

    const watchlistAssets = await db
      .select({
        symbol: assets.symbol,
        name: assets.name,
        assetClass: assets.assetClass,
      })
      .from(watchlist)
      .innerJoin(assets, eq(watchlist.assetId, assets.id));

    const totalCostEur = portfolioAssets.reduce(
      (sum, a) => sum + (a.costBasisEur ?? 0) * (a.quantity ?? 0),
      0,
    );

    const portfolioFull = [
      `Total portfolio cost basis: €${totalCostEur.toFixed(2)}`,
      `Holdings (${portfolioAssets.length}):`,
      ...portfolioAssets.map(
        (a) =>
          `  - ${a.symbol} (${a.name}, ${a.assetClass}): qty=${a.quantity}, cost_per_unit=${a.costBasisPerUnit} ${a.currency}, cost_eur=${((a.costBasisEur ?? 0) * (a.quantity ?? 0)).toFixed(2)}, bought=${a.purchaseDate}`,
      ),
      `Watchlist (${watchlistAssets.length}):`,
      ...watchlistAssets.map(
        (a) => `  - ${a.symbol} (${a.name}, ${a.assetClass})`,
      ),
    ].join("\n");

    // 2. Recent news digest
    const weekAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const recentNews = await db
      .select({
        title: newsItems.title,
        category: newsItems.category,
        sentiment: newsItems.sentiment,
        sentimentScore: newsItems.sentimentScore,
        source: newsItems.source,
        publishedAt: newsItems.publishedAt,
      })
      .from(newsItems)
      .where(gte(newsItems.fetchedAt, weekAgo))
      .orderBy(desc(newsItems.relevanceScore))
      .limit(40);

    const newsDigest =
      recentNews.length > 0
        ? recentNews
            .map(
              (n) =>
                `- [${n.category || "?"}] ${n.title} (${n.sentiment || "neutral"}, ${n.sentimentScore ?? 0}) — ${n.source}, ${n.publishedAt?.slice(0, 10)}`,
            )
            .join("\n")
        : "No recent news data available.";

    // 3. Active Scout recommendations
    const activeRecsRows = await db
      .select()
      .from(recommendations)
      .where(
        and(
          eq(recommendations.status, "active"),
          gte(
            recommendations.createdAt,
            new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          ),
        ),
      )
      .orderBy(desc(recommendations.createdAt));

    const activeRecs =
      activeRecsRows.length > 0
        ? activeRecsRows
            .map(
              (r) =>
                `- [${r.agentId}/${r.type}] ${r.title} (confidence=${r.confidence}, horizon=${r.timeHorizon})\n  Thesis: ${r.thesis.slice(0, 200)}...`,
            )
            .join("\n")
        : "No active recommendations.";

    // 4. Macro data context
    const macroData = [
      "Current macro context (derived from news and market data):",
      "- EUR base currency portfolio",
      "- Key indicators to assess: yield curve dynamics, central bank policy, inflation trajectory",
      "- Consider: geopolitical risks, sector rotation signals, cross-asset correlations",
      `- Date: ${new Date().toISOString().slice(0, 10)}`,
    ].join("\n");

    return { portfolioFull, newsDigest, activeRecs, macroData };
  }

  buildTask(context: StrategistContext): OrchestratorTask {
    return {
      skillId: "macro-synthesis",
      input: {
        portfolioFull: context.portfolioFull,
        newsDigest: context.newsDigest,
        activeRecs: context.activeRecs,
        macroData: context.macroData,
      },
      crossVerify: true,
      verifierCount: 2,
    };
  }

  async processResponse(
    response: AIResponse,
  ): Promise<AgentRunResult & { output: StrategistOutput | null }> {
    let output: StrategistOutput | null = null;

    if (response.parsed && typeof response.parsed === "object") {
      output = response.parsed as StrategistOutput;
    } else {
      try {
        let jsonStr = response.text.trim();
        if (jsonStr.startsWith("```")) {
          jsonStr = jsonStr
            .replace(/^```(?:json)?\n?/, "")
            .replace(/\n?```$/, "");
        }
        output = JSON.parse(jsonStr);
      } catch {
        console.error("[Strategist] Failed to parse response as JSON");
      }
    }

    const recCount = output?.recommendations?.length ?? 0;
    const scenarioCount = output?.scenarios?.length ?? 0;

    return {
      itemsProcessed: recCount + scenarioCount,
      itemsCreated: 0,
      summary: `Generated ${scenarioCount} scenarios, ${recCount} recommendations`,
      output,
    };
  }

  async persistResults(
    result: AgentRunResult & { output?: StrategistOutput | null },
  ): Promise<void> {
    if (!result.output) return;

    const db = getDb();
    let created = 0;

    // Persist individual recommendations
    for (const rec of result.output.recommendations || []) {
      try {
        await db.insert(recommendations).values({
          id: newId(),
          agentId: "strategist",
          type: rec.type || "macro_thesis",
          title: rec.title,
          thesis: rec.thesis,
          evidence: rec.evidence as unknown as Record<string, unknown>,
          riskAssessment: rec.riskAssessment,
          confidence: Math.max(0, Math.min(1, rec.confidence)),
          timeHorizon: rec.timeHorizon || "months",
          relatedAssets: rec.relatedAssets as unknown as Record<string, unknown>,
          status: "active",
          expiresAt: computeExpiry(rec.timeHorizon || "months"),
        });
        created++;
      } catch (error) {
        console.error(
          "[Strategist] Failed to persist recommendation:",
          error,
        );
      }
    }

    // Persist the macro regime + scenarios as a single macro_thesis
    if (result.output.macroRegime && result.output.scenarios?.length) {
      try {
        const scenarioSummary = result.output.scenarios
          .map(
            (s) =>
              `**${s.name}** (${(s.probability * 100).toFixed(0)}%): ${s.description}`,
          )
          .join("\n\n");

        const assumptions = (result.output.assumptions || [])
          .map(
            (a) =>
              `- ${a.assumption} (validity: ${(a.validity * 100).toFixed(0)}%) — ${a.challenge}`,
          )
          .join("\n");

        await db.insert(recommendations).values({
          id: newId(),
          agentId: "strategist",
          type: "macro_thesis",
          title: `Macro Regime: ${result.output.macroRegime.current}`,
          thesis: `Current regime: ${result.output.macroRegime.current} (confidence: ${(result.output.macroRegime.confidence * 100).toFixed(0)}%)\n\nTransition risks: ${result.output.macroRegime.transitionRisks.join(", ")}\n\n## Scenarios\n${scenarioSummary}\n\n## Assumptions Under Review\n${assumptions}`,
          evidence: [
            ...result.output.historicalParallels.map((h) => ({
              type: "macro" as const,
              detail: `Historical parallel: ${h.period} (similarity: ${(h.similarity * 100).toFixed(0)}%). Key difference: ${h.keyDifference}`,
            })),
            ...(result.output.scenarios || []).flatMap((s) =>
              s.signals.map((sig) => ({
                type: "macro" as const,
                detail: sig,
              })),
            ),
          ] as unknown as Record<string, unknown>,
          riskAssessment: result.output.macroRegime.transitionRisks.join("; "),
          confidence: result.output.macroRegime.confidence,
          timeHorizon: "quarters",
          relatedAssets: null,
          status: "active",
          expiresAt: result.output.nextReview || computeExpiry("quarters"),
        });
        created++;
      } catch (error) {
        console.error("[Strategist] Failed to persist macro thesis:", error);
      }
    }

    result.itemsCreated = created;
    result.summary = `${result.summary}, persisted ${created}`;
  }
}

/** Create a Strategist agent instance. */
export function createStrategist(): StrategistAgent {
  return new StrategistAgent();
}
