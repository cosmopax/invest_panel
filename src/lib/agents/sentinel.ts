import Anthropic from "@anthropic-ai/sdk";
import { BaseAgent, type AgentConfig, type AgentRunResult } from "./base-agent";
import {
  fetchAllNews,
  getTrackedAssets,
  persistNewsItems,
  type RawNewsItem,
} from "@/lib/services/news-service";
import { MODELS } from "@/lib/ai/claude-client";

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

/** Sentinel agent — monitors news, classifies, and tags sentiment. */
export class SentinelAgent extends BaseAgent {
  constructor() {
    const config: AgentConfig = {
      id: "sentinel",
      name: "Sentinel",
      model: MODELS.routine,
      maxTokensOutput: parseInt(
        process.env.AGENT_SENTINEL_MAX_OUTPUT_TOKENS || "2000",
      ),
      schedule: process.env.AGENT_SENTINEL_CRON || "*/15 * * * *",
    };
    super(config);
  }

  async gatherContext(): Promise<{
    newItems: RawNewsItem[];
    trackedAssets: Awaited<ReturnType<typeof getTrackedAssets>>;
  }> {
    const [newItems, trackedAssets] = await Promise.all([
      fetchAllNews(),
      getTrackedAssets(),
    ]);
    return { newItems, trackedAssets };
  }

  getSystemPrompt(): string {
    return `You are Sentinel, a financial news intelligence analyst for the MERIDIAN investment research platform. Your role is to classify, assess, and score news articles.

For each article in the batch, return a JSON array of assessments. Each assessment must have this structure:

{
  "index": <number>,
  "category": "geopolitics" | "macro" | "central_bank" | "tech" | "energy" | "regulatory" | "earnings" | "market_structure",
  "relevanceScore": 0.0-1.0,
  "sentiment": "bullish" | "bearish" | "neutral",
  "sentimentScore": -1.0 to 1.0,
  "sentimentAssets": { "<SYMBOL>": { "sentiment": "bullish"|"bearish"|"neutral", "score": -1.0 to 1.0 } },
  "sourceQuality": 1-10,
  "narrativeTag": "string or null",
  "isActionable": boolean,
  "summary": "2-sentence key takeaway"
}

SCORING GUIDELINES:
- relevanceScore: 0.8+ for direct portfolio impact (earnings, regulatory), 0.5-0.8 for sector/macro, 0.2-0.5 for general market, <0.2 for tangential
- sentimentScore: +0.7 to +1.0 very bullish, +0.3 to +0.7 moderately bullish, -0.3 to +0.3 neutral, etc.
- sourceQuality: Reuters/Bloomberg 9, ECB/BIS 10, FT 8, mainstream financial 6, blogs/social 3

Return ONLY a valid JSON array. No explanatory text.`;
  }

  buildMessages(context: {
    newItems: RawNewsItem[];
    trackedAssets: Awaited<ReturnType<typeof getTrackedAssets>>;
  }): Anthropic.MessageParam[] {
    if (context.newItems.length === 0) {
      return [
        {
          role: "user",
          content: "No new articles to classify. Return an empty JSON array: []",
        },
      ];
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

    return [
      {
        role: "user",
        content: `${portfolioContext}\n\nClassify the following ${context.newItems.length} article(s):\n\n${articleList}`,
      },
    ];
  }

  async processResponse(
    response: Anthropic.Message,
  ): Promise<AgentRunResult & { classifications: SentinelClassification[] }> {
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return {
        itemsProcessed: 0,
        itemsCreated: 0,
        summary: "No text response from Claude",
        classifications: [],
      };
    }

    let classifications: SentinelClassification[] = [];
    try {
      // Extract JSON from response (handle potential markdown code blocks)
      let jsonStr = textBlock.text.trim();
      if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }
      classifications = JSON.parse(jsonStr);
      if (!Array.isArray(classifications)) {
        classifications = [];
      }
    } catch {
      console.error("[Sentinel] Failed to parse Claude response as JSON");
      classifications = [];
    }

    return {
      itemsProcessed: classifications.length,
      itemsCreated: 0, // Updated after persistResults
      summary: `Classified ${classifications.length} articles`,
      classifications,
    };
  }

  async persistResults(
    result: AgentRunResult & { classifications?: SentinelClassification[] },
  ): Promise<void> {
    // Re-fetch newItems to match with classifications
    // (gatherContext was called earlier, items are in memory via the run flow)
    // We need to access the items from gatherContext — store them on instance
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

  // Store context between lifecycle methods
  private _lastContext: {
    newItems: RawNewsItem[];
    trackedAssets: Awaited<ReturnType<typeof getTrackedAssets>>;
  } | null = null;

  /** Override run to capture context for persistResults. */
  async run(trigger: "scheduled" | "manual" | "event"): Promise<AgentRunResult> {
    // Intercept gatherContext to store the result
    const originalGather = this.gatherContext.bind(this);
    this.gatherContext = async () => {
      const ctx = await originalGather();
      this._lastContext = ctx;
      return ctx;
    };

    const result = await super.run(trigger);
    this._lastContext = null;
    return result;
  }
}

/** Create a Sentinel agent instance. */
export function createSentinel(): SentinelAgent {
  return new SentinelAgent();
}
