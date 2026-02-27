import type { Skill } from "../types";

/**
 * Librarian's knowledge discovery skill.
 * Finds new knowledge entries from academic/financial sources.
 * Preferred provider: Gemini (fast, broad knowledge).
 */
export const discoverKnowledgeSkill: Skill = {
  id: "discover-knowledge",
  name: "Discover Knowledge",
  description: "Discover new financial knowledge entries for the MERIDIAN knowledge library",
  systemPrompt: `You are Librarian, a knowledge curator for the MERIDIAN investment research platform. Your job is to discover and formulate new knowledge entries about financial concepts, models, and frameworks.

Each entry must follow this JSON schema:

{
  "title": "Entry title",
  "slug": "url-friendly-slug",
  "domain": "financial_math" | "behavioral_econ" | "macro" | "futures_studies" | "game_theory" | "complexity",
  "subdomain": "specific subdomain",
  "summary": "2-3 sentence overview",
  "explanation": "Full multi-paragraph explanation in markdown. Include historical context, key concepts, and how it relates to financial markets.",
  "mathematicalFormulation": "LaTeX/KaTeX notation (or null if not applicable)",
  "practicalApplication": "How to apply this concept to personal investing. Be specific and actionable.",
  "limitations": "Known limitations and critiques",
  "authors": ["Original author names"],
  "year": 1970,
  "tags": ["relevant", "tags"]
}

QUALITY STANDARDS:
- Explanations should be 200-400 words, educational but not simplistic
- Mathematical formulations should use proper LaTeX
- Practical applications must be specific to individual investors (not institutional)
- Include both foundational classics and emerging concepts
- Focus on concepts with genuine investment applicability

Return a JSON array of 2-3 new entries. Prioritize domains with fewer entries.
Return ONLY valid JSON. No explanatory text.`,

  promptTemplate: `The knowledge library currently has these entries: {{existingTitles}}

Domain distribution: {{domainSummary}}

Generate 2-3 NEW entries that do NOT duplicate existing content. Prioritize underrepresented domains. Focus on concepts with clear investment applicability.`,

  outputSchema: {
    type: "array",
    items: {
      type: "object",
      properties: {
        title: { type: "string" },
        slug: { type: "string" },
        domain: { type: "string" },
        subdomain: { type: "string" },
        summary: { type: "string" },
        explanation: { type: "string" },
        mathematicalFormulation: { type: ["string", "null"] },
        practicalApplication: { type: "string" },
        limitations: { type: "string" },
        authors: { type: "array", items: { type: "string" } },
        year: { type: "number" },
        tags: { type: "array", items: { type: "string" } },
      },
      required: ["title", "slug", "domain", "summary", "explanation", "practicalApplication"],
    },
  },

  preferredProvider: "gemini",
  maxTokens: 4000,
  temperature: 0.7,
};
