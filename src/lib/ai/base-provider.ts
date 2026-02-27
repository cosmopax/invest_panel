import { execFile } from "node:child_process";
import type {
  AIRequest,
  AIResponse,
  HealthCheckResult,
  ProviderType,
  ProviderStatus,
} from "./types";

/** Default execution timeout: 120 seconds. */
const DEFAULT_TIMEOUT_MS = 120_000;

/**
 * Abstract base class for CLI-based AI providers.
 * Subclasses implement buildCommand() and parseOutput() for their specific CLI tool.
 */
export abstract class BaseAIProvider {
  abstract readonly type: ProviderType;
  abstract readonly cliCommand: string;

  /**
   * Build CLI arguments for this provider.
   * Returns [command, args[]] tuple.
   */
  protected abstract buildArgs(request: AIRequest): string[];

  /**
   * Parse raw stdout into an AIResponse.
   * Each provider has different output formats.
   */
  protected abstract parseOutput(
    stdout: string,
    startTime: number,
  ): AIResponse;

  /**
   * Execute a prompt via CLI subprocess.
   * Returns parsed AIResponse on success, throws on failure.
   */
  async exec(request: AIRequest): Promise<AIResponse> {
    const timeout = request.timeout ?? DEFAULT_TIMEOUT_MS;
    const args = this.buildArgs(request);
    const startTime = Date.now();

    const stdout = await this.spawn(this.cliCommand, args, timeout);
    return this.parseOutput(stdout, startTime);
  }

  /**
   * Execute and parse JSON from the response.
   * Attempts to extract valid JSON from the text response.
   */
  async execJSON<T = unknown>(request: AIRequest): Promise<T> {
    const response = await this.exec(request);

    if (response.parsed !== null) {
      return response.parsed as T;
    }

    // Try to parse the text as JSON
    return this.extractJSON<T>(response.text);
  }

  /**
   * Health check — verify the CLI tool is installed and responsive.
   */
  async healthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    try {
      await this.spawn(this.cliCommand, this.healthArgs(), 10_000);
      return {
        provider: this.type,
        status: "available" as ProviderStatus,
        latencyMs: Date.now() - startTime,
        checkedAt: new Date().toISOString(),
      };
    } catch (error) {
      return {
        provider: this.type,
        status: "unavailable" as ProviderStatus,
        error: error instanceof Error ? error.message : String(error),
        latencyMs: Date.now() - startTime,
        checkedAt: new Date().toISOString(),
      };
    }
  }

  /** CLI args for the health check command. */
  protected abstract healthArgs(): string[];

  /** Extract JSON from a text string, handling markdown fences. */
  protected extractJSON<T>(text: string): T {
    let cleaned = text.trim();

    // Strip markdown code fences
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    // Try to find JSON array or object
    const jsonMatch = cleaned.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]) as T;
    }

    return JSON.parse(cleaned) as T;
  }

  /** Spawn a subprocess and return stdout. */
  private spawn(
    command: string,
    args: string[],
    timeout: number,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const env = { ...process.env };

      // Unset CLAUDECODE to avoid nesting detection when spawning Claude CLI
      delete env.CLAUDECODE;

      const child = execFile(
        command,
        args,
        {
          timeout,
          maxBuffer: 10 * 1024 * 1024, // 10MB
          env,
        },
        (error, stdout, stderr) => {
          if (error) {
            const msg = stderr?.trim() || error.message;
            reject(new Error(`${this.type} CLI failed: ${msg}`));
            return;
          }
          resolve(stdout);
        },
      );

      // Kill on timeout (belt + suspenders with execFile timeout)
      const timer = setTimeout(() => {
        child.kill("SIGTERM");
        reject(new Error(`${this.type} CLI timed out after ${timeout}ms`));
      }, timeout + 1000);

      child.on("close", () => clearTimeout(timer));
    });
  }
}
