import { BaseAIProvider } from "../base-provider";
import type { AIRequest, AIResponse, ProviderType } from "../types";

/**
 * Gemini CLI provider.
 *
 * Command: gemini -p "prompt" -o json -m gemini-3.1-pro-preview -y
 *
 * No --system-prompt flag — system context injected as prompt prefix.
 * -y auto-approves tool use.
 * JSON output: {"response": "...", "model": "..."}
 */
export class GeminiProvider extends BaseAIProvider {
  readonly type: ProviderType = "gemini";
  readonly cliCommand = "gemini";

  protected buildArgs(request: AIRequest): string[] {
    const prompt = this.buildPrompt(request);

    return [
      "-p",
      prompt,
      "-o",
      "json",
      "-m",
      "gemini-3.1-pro-preview",
      "-y",
    ];
  }

  protected parseOutput(stdout: string, startTime: number): AIResponse {
    const durationMs = Date.now() - startTime;

    try {
      const data = JSON.parse(stdout);
      const text = data.response ?? data.content ?? data.result ?? stdout;
      let parsed: unknown = null;

      if (typeof text === "string") {
        try {
          parsed = this.extractJSON(text);
        } catch {
          // Text response
        }
      } else {
        parsed = text;
      }

      return {
        text: typeof text === "string" ? text : JSON.stringify(text),
        provider: "gemini",
        parsed,
        durationMs,
        wasFallback: false,
      };
    } catch {
      return {
        text: stdout.trim(),
        provider: "gemini",
        parsed: null,
        durationMs,
        wasFallback: false,
      };
    }
  }

  protected healthArgs(): string[] {
    return ["-p", "Respond with exactly: OK", "-o", "json", "-m", "gemini-3.1-pro-preview", "-y"];
  }

  /**
   * Build prompt with system context prefix.
   * Gemini has no --system-prompt flag, so we inject it into the prompt.
   */
  private buildPrompt(request: AIRequest): string {
    if (request.systemPrompt) {
      return `<system>\n${request.systemPrompt}\n</system>\n\n${request.prompt}`;
    }
    return request.prompt;
  }
}
