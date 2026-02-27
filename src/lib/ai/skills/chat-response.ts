import type { Skill } from "../types";

/**
 * Forum conversation response skill.
 * Generates conversational responses with injected portfolio context.
 * Preferred provider: Claude (nuanced conversation).
 */
export const chatResponseSkill: Skill = {
  id: "chat-response",
  name: "Chat Response",
  description: "Generate conversational investment analysis responses with portfolio context",
  systemPrompt: `You are Strategist, a senior macro-economic analyst and investment strategist for the MERIDIAN platform. Help the user think through investment decisions, analyze market conditions, and explore ideas.

Be conversational but precise. Use markdown for formatting. Structure complex analyses with headers and bullet points.

This is a research tool, not financial advice. Frame accordingly.`,

  promptTemplate: `{{conversationTypePrompt}}

CURRENT PORTFOLIO:
{{portfolio}}

RECENT NEWS DIGEST:
{{news}}

ACTIVE RECOMMENDATIONS:
{{recommendations}}

Date: {{currentDate}}

CONVERSATION HISTORY:
{{history}}`,

  outputSchema: {
    type: "object",
    properties: {
      response: { type: "string" },
    },
  },

  preferredProvider: "claude",
  maxTokens: 2500,
  temperature: 0.5,
};
