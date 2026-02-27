import type { SubagentTask, SubagentResult, SubagentBatchResult } from "./types";
import { Orchestrator } from "../orchestrator";

/**
 * Parallel subagent executor.
 * Runs multiple AI tasks concurrently via Promise.allSettled with per-task timeouts.
 *
 * Usage:
 *   const batch = await SubagentExecutor.run([
 *     { id: "stocks", skill: "analyze-technicals", input: { ... }, timeout: 60000 },
 *     { id: "crypto", skill: "analyze-technicals", input: { ... }, timeout: 60000 },
 *   ]);
 */
export const SubagentExecutor = {
  /**
   * Execute multiple subagent tasks in parallel.
   * Each task gets its own timeout. Uses Promise.allSettled for fault tolerance.
   */
  async run(tasks: SubagentTask[]): Promise<SubagentBatchResult> {
    const batchStart = Date.now();

    const promises = tasks.map((task) => this.executeOne(task));
    const settled = await Promise.allSettled(promises);

    const results: SubagentResult[] = settled.map((outcome, idx) => {
      if (outcome.status === "fulfilled") {
        return outcome.value;
      }
      return {
        taskId: tasks[idx].id,
        success: false,
        error: outcome.reason instanceof Error
          ? outcome.reason.message
          : String(outcome.reason),
        durationMs: Date.now() - batchStart,
      };
    });

    return {
      results,
      successCount: results.filter((r) => r.success).length,
      failureCount: results.filter((r) => !r.success).length,
      totalDurationMs: Date.now() - batchStart,
    };
  },

  /**
   * Execute a single subagent task with timeout.
   */
  async executeOne(task: SubagentTask): Promise<SubagentResult> {
    const startTime = Date.now();

    try {
      const orchestratorTask = {
        skillId: task.skill,
        input: task.input,
        providerOverride: task.provider,
        crossVerify: task.crossVerify,
        timeout: task.timeout,
      };

      if (task.crossVerify) {
        const consensus = await withTimeout(
          Orchestrator.executeWithVerification(orchestratorTask),
          task.timeout,
        );
        return {
          taskId: task.id,
          success: true,
          response: consensus.primary,
          consensus,
          durationMs: Date.now() - startTime,
        };
      }

      const response = await withTimeout(
        Orchestrator.execute(orchestratorTask),
        task.timeout,
      );

      return {
        taskId: task.id,
        success: true,
        response,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        taskId: task.id,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startTime,
      };
    }
  },
};

/** Wrap a promise with a timeout. */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Subagent timed out after ${timeoutMs}ms`)),
      timeoutMs,
    );

    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}
