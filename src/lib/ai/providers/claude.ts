import { BaseAIProvider } from "../base-provider";
import type { AIRequest, AIResponse, ProviderType } from "../types";

/**
 * Claude Code CLI provider.
 *
 * Command: claude -p "prompt" --output-format json --model opus \
 *          --system-prompt "..." --json-schema '...' \
 *          --no-session-persistence --dangerously-skip-permissions
 *
 * MUST unset CLAUDECODE env var to avoid nesting detection.
 * JSON output: {"result": "...", "cost_usd": ..., "session_id": "..."}
 */
export class ClaudeProvider extends BaseAIProvider {
  readonly type: ProviderType = "claude";
  readonly cliCommand = "claude";

  protected buildArgs(request: AIRequest): string[] {
    const args = [
      "-p",
      this.buildPrompt(request),
      "--output-format",
      "json",
      "--model",
      "opus",
      "--no-session-persistence",
      "--dangerously-skip-permissions",
    ];

    // Claude supports --system-prompt natively
    if (request.systemPrompt) {
      args.push("--system-prompt", request.systemPrompt);
    }

    // Structured output via --json-schema
    if (request.outputSchema) {
      args.push("--json-schema", JSON.stringify(request.outputSchema));
    }

    if (request.maxTokens) {
      args.push("--max-tokens", String(request.maxTokens));
    }

    return args;
  }

  protected parseOutput(stdout: string, startTime: number): AIResponse {
    const durationMs = Date.now() - startTime;

    try {
      const data = JSON.parse(stdout);
      const text = data.result ?? data.content ?? stdout;
      let parsed: unknown = null;

      // Try to parse the result as JSON
      if (typeof text === "string") {
        try {
          parsed = this.extractJSON(text);
        } catch {
          // Text response, not JSON — that's fine
        }
      } else {
        parsed = text;
      }

      return {
        text: typeof text === "string" ? text : JSON.stringify(text),
        provider: "claude",
        parsed,
        durationMs,
        costUsd: data.cost_usd,
        wasFallback: false,
      };
    } catch {
      // Non-JSON output — treat as raw text
      return {
        text: stdout.trim(),
        provider: "claude",
        parsed: null,
        durationMs,
        wasFallback: false,
      };
    }
  }

  protected healthArgs(): string[] {
    return [
      "-p",
      "Respond with exactly: OK",
      "--output-format",
      "json",
      "--model",
      "haiku",
      "--no-session-persistence",
      "--dangerously-skip-permissions",
      "--max-tokens",
      "10",
    ];
  }

  /** Build prompt, system prompt is passed separately for Claude. */
  private buildPrompt(request: AIRequest): string {
    return request.prompt;
  }
}
