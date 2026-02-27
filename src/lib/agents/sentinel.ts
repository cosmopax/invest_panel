import { BaseAgent, type AgentConfig, type AgentRunResult } from "./base-agent";
import {
  fetchAllNews,
  getTrackedAssets,
  persistNewsItems,
  type RawNewsItem,
} from "@/lib/services/news-service";
import type { AIResponse, OrchestratorTask } from "@/lib/ai/types";

/** Sentinel classification result for a single news item. */
interface SentinelClassification {
  index: number;
  category: string;
  relevanceScore: number;
  sentiment: "bullish" | "bearish" | "neutral";
  sentimentScore: number;
  sentimentAssets?: Record<string, { sentiment: string; score: number }>;
  sourceQuality: number;
  narrativeTag?: string;
  isActionable: boolean;
  summary: string;
}

/** Sentinel context for a run. */
interface SentinelContext {
  newItems: RawNewsItem[];
  trackedAssets: Awaited<ReturnType<typeof getTrackedAssets>>;
}

/** Sentinel agent — monitors news, classifies, and tags sentiment. */
export class SentinelAgent extends BaseAgent {
  private _lastContext: SentinelContext | null = null;

  constructor() {
    const config: AgentConfig = {
      id: "sentinel",
      name: "Sentinel",
      skillId: "classify-news",
      maxTokensOutput: parseInt(
        process.env.AGENT_SENTINEL_MAX_OUTPUT_TOKENS || "2000",
      ),
      schedule: process.env.AGENT_SENTINEL_CRON || "*/15 * * * *",
      crossVerify: false, // High volume — no verification
    };
    super(config);
  }

  async gatherContext(): Promise<SentinelContext> {
    const [newItems, trackedAssets] = await Promise.all([
      fetchAllNews(),
      getTrackedAssets(),
    ]);
    this._lastContext = { newItems, trackedAssets };
    return { newItems, trackedAssets };
  }

  buildTask(context: SentinelContext): OrchestratorTask {
    if (context.newItems.length === 0) {
      return {
        skillId: "classify-news",
        input: {
          portfolioContext: "No tracked assets.",
          articleCount: "0",
          articleList: "No new articles to classify. Return an empty JSON array: []",
        },
      };
    }

    const portfolioContext = context.trackedAssets.length > 0
      ? `The user tracks these assets:\n${context.trackedAssets.map((a) => `- ${a.symbol} (${a.name}, ${a.assetClass})`).join("\n")}`
      : "The user has no tracked assets yet.";

    const articleList = context.newItems
      .map(
        (item, idx) =>
          `[${idx}] SOURCE: ${item.source} (quality: ${item.sourceQuality})\nTITLE: ${item.title}\nSUMMARY: ${item.summary || "N/A"}\nDATE: ${item.publishedAt}`,
      )
      .join("\n\n");

    return {
      skillId: "classify-news",
      input: {
        portfolioContext,
        articleCount: String(context.newItems.length),
        articleList,
      },
    };
  }

  async processResponse(
    response: AIResponse,
  ): Promise<AgentRunResult & { classifications: SentinelClassification[] }> {
    let classifications: SentinelClassification[] = [];

    if (response.parsed && Array.isArray(response.parsed)) {
      classifications = response.parsed as SentinelClassification[];
    } else {
      // Try to extract from text
      try {
        let jsonStr = response.text.trim();
        if (jsonStr.startsWith("```")) {
          jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
        }
        const parsed = JSON.parse(jsonStr);
        classifications = Array.isArray(parsed) ? parsed : [];
      } catch {
        console.error("[Sentinel] Failed to parse response as JSON");
      }
    }

    return {
      itemsProcessed: classifications.length,
      itemsCreated: 0,
      summary: `Classified ${classifications.length} articles`,
      classifications,
    };
  }

  async persistResults(
    result: AgentRunResult & { classifications?: SentinelClassification[] },
  ): Promise<void> {
    if (!this._lastContext || !result.classifications?.length) return;

    const classifiedItems = this._lastContext.newItems.map((item, idx) => {
      const classification = result.classifications?.find(
        (c) => c.index === idx,
      );
      return {
        ...item,
        category: classification?.category,
        relevanceScore: classification?.relevanceScore,
        sentiment: classification?.sentiment,
        sentimentScore: classification?.sentimentScore,
        sentimentAssets: classification?.sentimentAssets,
        narrativeTag: classification?.narrativeTag,
        sourceQuality: classification?.sourceQuality ?? item.sourceQuality,
      };
    });

    const inserted = await persistNewsItems(classifiedItems);
    result.itemsCreated = inserted;
    result.summary = `Classified ${result.itemsProcessed} articles, inserted ${inserted} new items`;
  }

  /** Override run to reset context after execution. */
  async run(trigger: "scheduled" | "manual" | "event"): Promise<AgentRunResult> {
    try {
      return await super.run(trigger);
    } finally {
      this._lastContext = null;
    }
  }
}

/** Create a Sentinel agent instance. */
export function createSentinel(): SentinelAgent {
  return new SentinelAgent();
}
