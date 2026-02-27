import type { ProviderType, AIResponse, ConsensusResult } from "../types";

/** A lightweight parallel task dispatched to any provider. */
export interface SubagentTask {
  /** Unique task identifier. */
  id: string;
  /** Skill ID to execute. */
  skill: string;
  /** Provider override (uses skill default if not set). */
  provider?: ProviderType;
  /** Input variables for the skill's prompt template. */
  input: Record<string, unknown>;
  /** Timeout in ms (default: 120000). */
  timeout: number;
  /** Enable cross-verification for this subtask. */
  crossVerify?: boolean;
}

/** Result from a single subagent execution. */
export interface SubagentResult {
  /** Task ID that produced this result. */
  taskId: string;
  /** Whether the task succeeded. */
  success: boolean;
  /** AI response (if successful). */
  response?: AIResponse;
  /** Consensus result (if cross-verification was enabled). */
  consensus?: ConsensusResult;
  /** Error message (if failed). */
  error?: string;
  /** Execution duration in ms. */
  durationMs: number;
}

/** Batch result from parallel subagent execution. */
export interface SubagentBatchResult {
  /** All individual results. */
  results: SubagentResult[];
  /** Count of successful tasks. */
  successCount: number;
  /** Count of failed tasks. */
  failureCount: number;
  /** Total execution duration in ms. */
  totalDurationMs: number;
}
