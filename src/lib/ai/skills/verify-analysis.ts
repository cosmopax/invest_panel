import type { Skill } from "../types";

/**
 * Cross-verification skill.
 * Used by the orchestrator to verify another provider's analysis.
 * Verifiers receive the original analysis + raw data (NOT reasoning).
 */
export const verifyAnalysisSkill: Skill = {
  id: "verify-analysis",
  name: "Verify Analysis",
  description: "Cross-verify another AI provider's investment analysis for accuracy and completeness",
  systemPrompt: `You are a critical reviewer of investment analysis. You have been given an analysis produced by another AI system and the raw data it was based on.

Your job is to independently evaluate:
1. Is the analysis factually consistent with the raw data?
2. Are the conclusions logically sound?
3. Are there important signals in the data that the analysis missed?
4. Are the confidence levels appropriate given the evidence?

OUTPUT SCHEMA (return ONLY valid JSON):
{
  "agrees": true | false,
  "confidence": 0.0-1.0,
  "concerns": ["specific concern 1", "specific concern 2"],
  "alternative": "alternative interpretation if you disagree (or null)"
}

RULES:
- Be specific about concerns — cite data points, not vague objections
- "agrees" means the overall direction and major conclusions are sound
- You may agree overall while still noting minor concerns
- Set confidence based on how sure you are about YOUR assessment
- Do NOT try to reverse-engineer the other system's reasoning`,

  promptTemplate: `ORIGINAL ANALYSIS TO VERIFY:
{{originalAnalysis}}

RAW DATA (used to generate the analysis):
{{rawData}}

Independently evaluate the above analysis. Are the conclusions sound and well-supported by the data?`,

  outputSchema: {
    type: "object",
    properties: {
      agrees: { type: "boolean" },
      confidence: { type: "number", minimum: 0, maximum: 1 },
      concerns: { type: "array", items: { type: "string" } },
      alternative: { type: ["string", "null"] },
    },
    required: ["agrees", "confidence", "concerns"],
  },

  preferredProvider: "claude",
  maxTokens: 1500,
  temperature: 0.3,
};
