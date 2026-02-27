---
name: agent-system
description: 'Claude API autonomous agent implementation patterns for MERIDIAN. Use this skill whenever building or modifying the Sentinel, Scout, Librarian, or Strategist agents, the BaseAgent class, agent scheduling, inter-agent communication, or any code that calls the Anthropic API. Also use when working with structured tool use, token budgets, or prompt templates.'
---

# Agent System Patterns for MERIDIAN

## BaseAgent Lifecycle

All agents extend BaseAgent with this lifecycle: TRIGGER → PREPARE → EXECUTE → PROCESS → PERSIST → NOTIFY

```typescript
export abstract class BaseAgent {
  abstract name: string;
  abstract model: string;
  abstract maxOutputTokens: number;

  async run(): Promise<AgentRunResult> {
    const runId = nanoid();
    const startedAt = new Date().toISOString();
    try {
      const context = await this.prepare();      // Gather inputs from DB
      const response = await this.execute(context); // Call Claude API
      const results = await this.process(response); // Parse structured output
      await this.persist(results);                  // Write to DB
      await this.logRun(runId, startedAt, "success", response.usage);
      return { status: "success", runId };
    } catch (error) {
      await this.logRun(runId, startedAt, "error", null, error);
      return { status: "error", runId, error };
    }
  }
}
```

## Claude API Call Pattern

Use the Anthropic SDK with structured tool use:

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const response = await client.messages.create({
  model: this.model,
  max_tokens: this.maxOutputTokens,
  system: this.systemPrompt,
  messages: [{ role: "user", content: this.buildPrompt(context) }],
  tools: this.getTools(), // Structured output tools
});
```

## Structured Output via Tools

Force structured JSON output by defining a tool and extracting its input:

```typescript
tools: [{
  name: "classify_news",
  description: "Classify and tag a news item",
  input_schema: {
    type: "object",
    properties: {
      category: { type: "string", enum: ["macro", "equity", "crypto", "commodity", "regulatory"] },
      sentiment: { type: "number", minimum: -1, maximum: 1 },
      relevantAssets: { type: "array", items: { type: "string" } },
      qualityScore: { type: "number", minimum: 0, maximum: 1 },
      summary: { type: "string", maxLength: 500 },
    },
    required: ["category", "sentiment", "relevantAssets", "qualityScore", "summary"]
  }
}]
```

Extract the tool use from the response:

```typescript
const toolUse = response.content.find(block => block.type === "tool_use");
if (toolUse) {
  const classified = newsClassificationSchema.parse(toolUse.input);
  // persist to database
}
```

## Model Selection

- Sentinel, Scout, Librarian: `process.env.CLAUDE_MODEL_ROUTINE` (Sonnet)
- Strategist: `process.env.CLAUDE_MODEL_DEEP` (Opus)

## Token Budget Enforcement

Each agent has a per-run token budget from env vars. Log actual usage for cost tracking:

```typescript
await this.logRun(runId, startedAt, "success", {
  inputTokens: response.usage.input_tokens,
  outputTokens: response.usage.output_tokens,
  cost: this.calculateCost(response.usage),
});
```

## Scheduling

node-cron in a singleton scheduler started in `src/app/api/cron/route.ts` or app startup:

```typescript
import cron from "node-cron";
if (process.env.AGENT_ENABLED === "true") {
  cron.schedule(process.env.AGENT_SENTINEL_CRON!, () => sentinel.run());
}
```
