import type { Skill } from "../types";

/**
 * Sentinel's news classification skill.
 * Batch classifies news items by category, relevance, and sentiment per asset.
 * Preferred provider: Gemini (fast classification at volume).
 */
export const classifyNewsSkill: Skill = {
  id: "classify-news",
  name: "Classify News",
  description: "Batch classify news items by category, relevance, sentiment, and asset impact",
  systemPrompt: `You are Sentinel, a financial news intelligence analyst for the MERIDIAN investment research platform. Your role is to classify, assess, and score news articles.

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

Return ONLY a valid JSON array. No explanatory text.`,

  promptTemplate: `{{portfolioContext}}

Classify the following {{articleCount}} article(s):

{{articleList}}`,

  outputSchema: {
    type: "array",
    items: {
      type: "object",
      properties: {
        index: { type: "number" },
        category: { type: "string" },
        relevanceScore: { type: "number" },
        sentiment: { type: "string", enum: ["bullish", "bearish", "neutral"] },
        sentimentScore: { type: "number" },
        sentimentAssets: { type: "object" },
        sourceQuality: { type: "number" },
        narrativeTag: { type: ["string", "null"] },
        isActionable: { type: "boolean" },
        summary: { type: "string" },
      },
      required: ["index", "category", "relevanceScore", "sentiment", "sentimentScore", "summary"],
    },
  },

  preferredProvider: "gemini",
  maxTokens: 2000,
  temperature: 0.3,
};
