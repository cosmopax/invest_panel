import type { Skill } from "../types";

/**
 * Strategist's scenario planning skill.
 * Generates probability-weighted future scenarios.
 * Preferred provider: Claude (deep reasoning).
 */
export const scenarioPlanningSkill: Skill = {
  id: "scenario-planning",
  name: "Scenario Planning",
  description: "Generate probability-weighted future scenarios with portfolio impact analysis",
  systemPrompt: `You are Strategist, a senior macro-economic analyst. Generate forward-looking scenarios with probability assignments and portfolio impact analysis.

OUTPUT SCHEMA (return ONLY valid JSON, no explanatory text):
{
  "scenarios": [
    {
      "name": "Base case",
      "probability": 0.45,
      "description": "1-2 paragraph scenario description with key drivers",
      "portfolioImpact": { "stocks": "+5-8%", "gold": "-2%", "crypto": "+10-15%" },
      "signals": ["Watch for: ...", "Invalidated if: ..."]
    }
  ],
  "scenarioMatrix": {
    "totalProbability": 1.0,
    "dominantTheme": "what connects the most likely scenarios"
  }
}

REQUIREMENTS:
- Generate 3-4 scenarios that sum to ~1.0 probability
- Each scenario must include at least 2 signals to monitor
- Portfolio impact must cover all tracked asset classes
- Include at least one tail-risk scenario (<15% probability)`,

  promptTemplate: `MACRO CONTEXT:
{{macroContext}}

PORTFOLIO:
{{portfolioSummary}}

CURRENT REGIME:
{{currentRegime}}

Generate forward-looking scenarios for the next {{timeframe}}.`,

  outputSchema: {
    type: "object",
    properties: {
      scenarios: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            probability: { type: "number" },
            description: { type: "string" },
            portfolioImpact: { type: "object" },
            signals: { type: "array", items: { type: "string" } },
          },
          required: ["name", "probability", "description", "portfolioImpact"],
        },
      },
      scenarioMatrix: { type: "object" },
    },
    required: ["scenarios"],
  },

  preferredProvider: "claude",
  maxTokens: 3000,
  temperature: 0.6,
};
