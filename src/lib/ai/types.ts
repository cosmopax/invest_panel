/**
 * Shared types for the Multi-AI Orchestration Framework.
 * Providers: Claude Code CLI, Gemini CLI, Codex CLI.
 */

/** Available AI provider identifiers. */
export type ProviderType = "claude" | "gemini" | "codex";

/** Provider health status. */
export type ProviderStatus = "available" | "unavailable" | "degraded";

/** Request to an AI provider. */
export interface AIRequest {
  /** System prompt (injected as --system-prompt or prompt prefix). */
  systemPrompt: string;
  /** User prompt content. */
  prompt: string;
  /** JSON Schema for structured output (optional). */
  outputSchema?: Record<string, unknown>;
  /** Max tokens for output (provider-dependent). */
  maxTokens?: number;
  /** Temperature (0-1). */
  temperature?: number;
  /** Timeout in milliseconds. */
  timeout?: number;
}

/** Response from an AI provider. */
export interface AIResponse {
  /** Raw text content. */
  text: string;
  /** Provider that generated this response. */
  provider: ProviderType;
  /** Parsed JSON if outputSchema was provided (or null). */
  parsed: unknown | null;
  /** Execution duration in ms. */
  durationMs: number;
  /** Estimated cost in USD (if available). */
  costUsd?: number;
  /** Whether this was a fallback execution. */
  wasFallback: boolean;
  /** Original provider attempted (if fallback). */
  originalProvider?: ProviderType;
}

/** Provider health check result. */
export interface HealthCheckResult {
  provider: ProviderType;
  status: ProviderStatus;
  latencyMs?: number;
  error?: string;
  checkedAt: string;
}

/** Skill definition — a reusable prompt template. */
export interface Skill {
  /** Unique skill identifier. */
  id: string;
  /** Human-readable name. */
  name: string;
  /** Description of what this skill does. */
  description: string;
  /** System prompt injected as --system-prompt or prompt prefix. */
  systemPrompt: string;
  /** Prompt template with {{variable}} substitution. */
  promptTemplate: string;
  /** JSON Schema for structured output. */
  outputSchema: Record<string, unknown>;
  /** Default provider for this skill. */
  preferredProvider: ProviderType;
  /** Max output tokens. */
  maxTokens: number;
  /** Temperature. */
  temperature: number;
}

/** Cross-verification result from an alternate provider. */
export interface VerificationResult {
  /** Verifier provider. */
  provider: ProviderType;
  /** Whether the verifier agrees with the primary analysis. */
  agrees: boolean;
  /** Confidence in the verification (0-1). */
  confidence: number;
  /** Specific concerns raised. */
  concerns: string[];
  /** Alternative analysis if disagreement. */
  alternative?: string;
}

/** Consensus evaluation from cross-verification. */
export interface ConsensusResult {
  /** Overall consensus status. */
  status: "unanimous" | "majority" | "no_consensus";
  /** Primary provider's response. */
  primary: AIResponse;
  /** Verification results from alternate providers. */
  verifications: VerificationResult[];
  /** Concerns from minority verifiers (if majority consensus). */
  minorityConcerns?: string[];
}

/** Orchestrator task configuration. */
export interface OrchestratorTask {
  /** Skill ID to execute. */
  skillId: string;
  /** Input variables for the prompt template. */
  input: Record<string, unknown>;
  /** Override provider (ignores skill's preferredProvider). */
  providerOverride?: ProviderType;
  /** Enable cross-verification. */
  crossVerify?: boolean;
  /** Number of verifiers (1 or 2). */
  verifierCount?: 1 | 2;
  /** Timeout override in ms. */
  timeout?: number;
}

/** Fallback chain: primary → fallback1 → fallback2. */
export interface FallbackChain {
  primary: ProviderType;
  fallbacks: ProviderType[];
}

/** Default fallback chains per task domain. */
export const DEFAULT_FALLBACK_CHAINS: Record<string, FallbackChain> = {
  sentinel: { primary: "gemini", fallbacks: ["claude", "codex"] },
  scout: { primary: "codex", fallbacks: ["claude", "gemini"] },
  librarian: { primary: "gemini", fallbacks: ["claude", "codex"] },
  strategist: { primary: "claude", fallbacks: ["gemini", "codex"] },
  forum: { primary: "claude", fallbacks: ["gemini", "codex"] },
};

/** Tasks that should be cross-verified. */
export const CROSS_VERIFY_TASKS: Record<string, { enabled: boolean; verifiers: number }> = {
  scout: { enabled: true, verifiers: 1 },
  strategist: { enabled: true, verifiers: 2 },
};
