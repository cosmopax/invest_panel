import { getDb } from "@/lib/db";
import { agentRuns } from "@/lib/db/schema";
import { newId } from "@/lib/utils/id";
import { eq } from "drizzle-orm";
import { Orchestrator } from "@/lib/ai/orchestrator";
import type { AIResponse, OrchestratorTask, ProviderType } from "@/lib/ai/types";

export interface AgentConfig {
  id: string; // 'sentinel' | 'scout' | 'librarian' | 'strategist'
  name: string;
  /** Primary skill ID used by this agent. */
  skillId: string;
  maxTokensOutput: number;
  schedule: string; // Cron expression
  /** Enable cross-verification for this agent's output. */
  crossVerify: boolean;
}

export interface AgentRunResult {
  itemsProcessed: number;
  itemsCreated: number;
  summary: string;
  /** Provider that actually served the request. */
  provider?: ProviderType;
  [key: string]: unknown;
}

/**
 * Abstract base class for all MERIDIAN agents.
 * Uses the Orchestrator for AI calls instead of the Anthropic SDK directly.
 * Lifecycle: record start -> gather context -> build task -> execute via Orchestrator -> process -> persist -> record end.
 */
export abstract class BaseAgent {
  constructor(protected config: AgentConfig) {}

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
      model: `orchestrator:${this.config.skillId}`,
    });

    try {
      // 1. Gather context
      const context = await this.gatherContext();

      // 2. Build orchestrator task
      const task = this.buildTask(context);

      // 3. Execute via Orchestrator
      const response = this.config.crossVerify
        ? (await Orchestrator.executeWithVerification(task)).primary
        : await Orchestrator.execute(task);

      // 4. Process response
      const result = await this.processResponse(response);
      result.provider = response.provider;

      // 5. Persist results
      await this.persistResults(result);

      // 6. Update run record
      await db
        .update(agentRuns)
        .set({
          status: "completed",
          completedAt: new Date().toISOString(),
          durationMs: Date.now() - startTime,
          result: result as Record<string, unknown>,
          estimatedCostUsd: response.costUsd ?? null,
          // DECISION: provider is stored in the model field as "provider:skill"
          model: `${response.provider}:${this.config.skillId}`,
        })
        .where(eq(agentRuns.id, runId));

      console.log(
        `[${this.config.name}] Run completed via ${response.provider}: ${result.itemsProcessed} processed, ${result.itemsCreated} created (${Date.now() - startTime}ms)${response.wasFallback ? ` [fallback from ${response.originalProvider}]` : ""}`,
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

  /** Build an OrchestratorTask from the gathered context. */
  abstract buildTask(context: unknown): OrchestratorTask;

  /** Process the AI response into a structured result. */
  abstract processResponse(response: AIResponse): Promise<AgentRunResult>;

  /** Persist the processed results to the database. */
  abstract persistResults(result: AgentRunResult): Promise<void>;
}
