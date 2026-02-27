import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;

/** Get the singleton Anthropic client. */
export function getClaudeClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

/** Model IDs used by the agent system. */
export const MODELS = {
  routine:
    process.env.CLAUDE_MODEL_ROUTINE || "claude-sonnet-4-5-20250929",
  deep: process.env.CLAUDE_MODEL_DEEP || "claude-opus-4-5-20251101",
} as const;

/** Pricing per million tokens (USD). */
const PRICING: Record<string, { input: number; output: number }> = {
  "claude-sonnet-4-5-20250929": { input: 3.0, output: 15.0 },
  "claude-opus-4-5-20251101": { input: 5.0, output: 25.0 },
  "claude-haiku-4-5-20251001": { input: 1.0, output: 5.0 },
};

/** Estimate cost in USD from token usage. */
export function estimateCost(
  model: string,
  usage: { input_tokens: number; output_tokens: number },
): number {
  const rates = PRICING[model] || { input: 3.0, output: 15.0 };
  return (
    (usage.input_tokens * rates.input +
      usage.output_tokens * rates.output) /
    1_000_000
  );
}
