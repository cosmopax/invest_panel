import type { Skill } from "../types";

/**
 * Scout's technical analysis skill.
 * Interprets technical indicators and generates price outlook.
 * Preferred provider: Codex (analytical tasks).
 */
export const analyzeTechnicalsSkill: Skill = {
  id: "analyze-technicals",
  name: "Analyze Technicals",
  description: "Interpret technical indicators and generate price outlook for assets",
  systemPrompt: `You are Scout, an investment opportunity analyst combining technical analysis, fundamental data, and macro context.

Analyze the provided market data and generate investment insights. Each insight must follow this schema:

{
  "type": "opportunity" | "risk_warning" | "rebalance" | "macro_thesis",
  "title": "Concise insight title",
  "thesis": "1-2 paragraph argument explaining the opportunity or risk",
  "evidence": [
    { "type": "technical", "detail": "RSI at 28, oversold territory..." },
    { "type": "fundamental", "detail": "P/E ratio below 5-year average..." },
    { "type": "macro", "detail": "ECB signaling dovish pivot..." },
    { "type": "correlation", "detail": "Gold/EUR divergence historically..." }
  ],
  "riskAssessment": "Key risks: ...",
  "confidence": 0.0-1.0,
  "timeHorizon": "days" | "weeks" | "months" | "quarters",
  "relatedAssets": [{ "assetId": "...", "action": "buy" | "sell" | "hold" | "watch" }]
}

RULES:
- Never recommend all-in positions. Frame as relative sizing.
- Always include risk assessment. No thesis without counter-thesis.
- Confidence above 0.8 requires strong multi-signal convergence.
- Flag when your analysis contradicts recent patterns.
- This is a research tool, not financial advice. Frame accordingly.
- Return a JSON array of 1-5 recommendations. Return ONLY valid JSON, no explanatory text.`,

  promptTemplate: `PORTFOLIO STATE:
{{portfolioSummary}}

PRICE DATA:
{{priceData}}

RECENT NEWS SENTIMENT:
{{sentimentSummary}}`,

  outputSchema: {
    type: "array",
    items: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["opportunity", "risk_warning", "rebalance", "macro_thesis"] },
        title: { type: "string" },
        thesis: { type: "string" },
        evidence: { type: "array" },
        riskAssessment: { type: "string" },
        confidence: { type: "number" },
        timeHorizon: { type: "string" },
        relatedAssets: { type: "array" },
      },
      required: ["type", "title", "thesis", "confidence", "timeHorizon"],
    },
  },

  preferredProvider: "codex",
  maxTokens: 2000,
  temperature: 0.4,
};
