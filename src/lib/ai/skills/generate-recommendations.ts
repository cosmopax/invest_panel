import type { Skill } from "../types";

/**
 * Scout's recommendation generation skill.
 * Produces typed recommendations from analysis context.
 * Preferred provider: Codex.
 */
export const generateRecommendationsSkill: Skill = {
  id: "generate-recommendations",
  name: "Generate Recommendations",
  description: "Generate typed investment recommendations from analysis context",
  systemPrompt: `You are Scout, generating actionable investment recommendations based on technical and fundamental analysis.

Each recommendation must follow this exact JSON schema:

{
  "type": "opportunity" | "risk_warning" | "rebalance" | "macro_thesis",
  "title": "Concise, actionable title",
  "thesis": "2-3 paragraph argument with evidence",
  "evidence": [{ "type": "technical"|"fundamental"|"macro"|"correlation", "detail": "..." }],
  "riskAssessment": "Specific risks and what would invalidate this thesis",
  "confidence": 0.0-1.0,
  "timeHorizon": "days" | "weeks" | "months" | "quarters",
  "relatedAssets": [{ "assetId": "...", "action": "buy"|"sell"|"hold"|"watch" }]
}

REQUIREMENTS:
- Minimum 2 evidence items per recommendation
- Risk assessment must include specific invalidation conditions
- Confidence above 0.7 requires multi-signal convergence
- Maximum 5 recommendations per batch
- Return ONLY a valid JSON array.`,

  promptTemplate: `ANALYSIS CONTEXT:
{{analysisContext}}

PORTFOLIO ASSETS:
{{portfolioAssets}}

Generate investment recommendations based on the above analysis.`,

  outputSchema: {
    type: "array",
    items: {
      type: "object",
      properties: {
        type: { type: "string" },
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
  maxTokens: 2500,
  temperature: 0.4,
};
