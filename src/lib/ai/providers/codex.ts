import { BaseAIProvider } from "../base-provider";
import type { AIRequest, AIResponse, ProviderType } from "../types";

/**
 * Codex CLI provider.
 *
 * Command: codex exec "prompt" --json --ephemeral -m gpt-5.3-codex -a never
 *
 * JSONL output — parse for item.completed and turn.completed events.
 * --output-schema for structured output.
 * -a never disables auto-approval (safe mode).
 * --ephemeral prevents session persistence.
 */
export class CodexProvider extends BaseAIProvider {
  readonly type: ProviderType = "codex";
  readonly cliCommand = "codex";

  protected buildArgs(request: AIRequest): string[] {
    const prompt = this.buildPrompt(request);
    const args = [
      "exec",
      prompt,
      "--json",
      "--ephemeral",
      "-m",
      "gpt-5.3-codex",
      "-a",
      "never",
    ];

    if (request.outputSchema) {
      args.push("--output-schema", JSON.stringify(request.outputSchema));
    }

    return args;
  }

  protected parseOutput(stdout: string, startTime: number): AIResponse {
    const durationMs = Date.now() - startTime;

    // Codex outputs JSONL — find the completed event
    const lines = stdout.trim().split("\n");
    let responseText = "";
    let parsed: unknown = null;

    for (const line of lines) {
      try {
        const event = JSON.parse(line);

        // Look for the final completed response
        if (event.type === "item.completed" && event.item?.content) {
          for (const content of event.item.content) {
            if (content.type === "output_text" || content.type === "text") {
              responseText = content.text ?? content.content ?? "";
            }
          }
        }

        // Also check turn.completed
        if (event.type === "turn.completed" && event.turn?.output) {
          for (const output of event.turn.output) {
            if (output.content) {
              for (const content of output.content) {
                if (content.type === "output_text" || content.type === "text") {
                  responseText = content.text ?? content.content ?? "";
                }
              }
            }
          }
        }

        // Direct message format
        if (event.message?.content) {
          responseText = typeof event.message.content === "string"
            ? event.message.content
            : JSON.stringify(event.message.content);
        }
      } catch {
        // Not valid JSON line — skip
      }
    }

    // If we couldn't parse JSONL events, use raw output
    if (!responseText) {
      responseText = stdout.trim();
    }

    // Try to extract JSON from text
    try {
      parsed = this.extractJSON(responseText);
    } catch {
      // Not JSON, that's fine
    }

    return {
      text: responseText,
      provider: "codex",
      parsed,
      durationMs,
      wasFallback: false,
    };
  }

  protected healthArgs(): string[] {
    return [
      "exec",
      "Respond with exactly: OK",
      "--json",
      "--ephemeral",
      "-m",
      "gpt-5.3-codex",
      "-a",
      "never",
    ];
  }

  /**
   * Build prompt with system context prefix.
   * Codex has no --system-prompt flag, so we inject it.
   */
  private buildPrompt(request: AIRequest): string {
    if (request.systemPrompt) {
      return `<system>\n${request.systemPrompt}\n</system>\n\n${request.prompt}`;
    }
    return request.prompt;
  }
}
