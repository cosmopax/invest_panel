import type { Skill } from "../types";

/**
 * Context summarization skill for Forum conversations.
 * Compresses portfolio/news/recs into conversation context.
 * Preferred provider: Gemini (fast summarization).
 */
export const summarizeContextSkill: Skill = {
  id: "summarize-context",
  name: "Summarize Context",
  description: "Compress portfolio, news, and recommendation data into concise conversation context",
  systemPrompt: `You are a financial data summarizer. Compress the provided portfolio, news, and recommendation data into a concise context block for use in a conversation.

OUTPUT REQUIREMENTS:
- Maximum 500 words total
- Preserve key numbers (prices, quantities, percentages)
- Highlight the most important 3-5 news items
- Summarize portfolio composition by asset class
- Note any active high-confidence recommendations
- Use bullet points for scannability
- Return plain text (no JSON)`,

  promptTemplate: `PORTFOLIO DATA:
{{portfolio}}

RECENT NEWS (last 7 days):
{{news}}

ACTIVE RECOMMENDATIONS:
{{recommendations}}

Summarize this data into a concise context block (max 500 words).`,

  outputSchema: {
    type: "object",
    properties: {
      summary: { type: "string" },
    },
  },

  preferredProvider: "gemini",
  maxTokens: 800,
  temperature: 0.2,
};
