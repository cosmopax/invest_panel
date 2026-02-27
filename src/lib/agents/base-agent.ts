import Anthropic from "@anthropic-ai/sdk";
import { getClaudeClient, estimateCost } from "@/lib/ai/claude-client";
import { getDb } from "@/lib/db";
import { agentRuns } from "@/lib/db/schema";
import { newId } from "@/lib/utils/id";
import { eq } from "drizzle-orm";

export interface AgentConfig {
  id: string; // 'sentinel' | 'scout' | 'librarian' | 'strategist'
  name: string;
  model: string;
  maxTokensOutput: number;
  schedule: string; // Cron expression
}

export interface AgentRunResult {
  itemsProcessed: number;
  itemsCreated: number;
  summary: string;
  [key: string]: unknown;
}

/**
 * Abstract base class for all MERIDIAN agents.
 * Handles lifecycle: record start → gather context → call Claude → process → persist → record end.
 */
export abstract class BaseAgent {
  protected client: Anthropic;

  constructor(protected config: AgentConfig) {
    this.client = getClaudeClient();
  }

  /** Execute a full agent run. */
  async run(trigger: "scheduled" | "manual" | "event"): Promise<AgentRunResult> {
    const db = getDb();
    const runId = newId();
    const startTime = Date.now();

    // Record run start
    await db.insert(agentRuns).values({
      id: runId,
      agentId: this.config.id,
      triggerType: trigger,
      status: "running",
      model: this.config.model,
    });

    try {
      // 1. Gather context
      const context = await this.gatherContext();

      // 2. Build messages
      const messages = this.buildMessages(context);

      // 3. Execute Claude API call
      const response = await this.client.messages.create({
        model: this.config.model,
        max_tokens: this.config.maxTokensOutput,
        system: this.getSystemPrompt(),
        messages,
      });

      // 4. Process response
      const result = await this.processResponse(response);

      // 5. Persist results
      await this.persistResults(result);

      // 6. Update run record
      const usage = response.usage;
      await db
        .update(agentRuns)
        .set({
          status: "completed",
          completedAt: new Date().toISOString(),
          durationMs: Date.now() - startTime,
          result: result as Record<string, unknown>,
          tokensInput: usage.input_tokens,
          tokensOutput: usage.output_tokens,
          estimatedCostUsd: estimateCost(this.config.model, usage),
        })
        .where(eq(agentRuns.id, runId));

      console.log(
        `[${this.config.name}] Run completed: ${result.itemsProcessed} processed, ${result.itemsCreated} created (${Date.now() - startTime}ms)`,
      );

      return result;
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : String(error);
      await db
        .update(agentRuns)
        .set({
          status: "failed",
          error: errorMsg,
          completedAt: new Date().toISOString(),
          durationMs: Date.now() - startTime,
        })
        .where(eq(agentRuns.id, runId));

      console.error(`[${this.config.name}] Run failed:`, errorMsg);
      throw error;
    }
  }

  /** Gather context from the database for this run. */
  abstract gatherContext(): Promise<unknown>;

  /** Get the system prompt for Claude. */
  abstract getSystemPrompt(): string;

  /** Build the messages array for the Claude API call. */
  abstract buildMessages(context: unknown): Anthropic.MessageParam[];

  /** Process Claude's response into a structured result. */
  abstract processResponse(
    response: Anthropic.Message,
  ): Promise<AgentRunResult>;

  /** Persist the processed results to the database. */
  abstract persistResults(result: AgentRunResult): Promise<void>;
}
