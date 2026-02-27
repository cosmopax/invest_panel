import type {
  AIRequest,
  AIResponse,
  OrchestratorTask,
  ConsensusResult,
  VerificationResult,
  FallbackChain,
  ProviderType,
} from "./types";
import { DEFAULT_FALLBACK_CHAINS, CROSS_VERIFY_TASKS } from "./types";
import { ProviderRegistry } from "./registry";
import { getSkill, renderPrompt } from "./skills";

/**
 * Orchestrator — routes tasks to providers with fallback and cross-verification.
 *
 * Usage:
 *   const result = await Orchestrator.execute({ skillId: "classify-news", input: { ... } });
 *   const verified = await Orchestrator.executeWithVerification({ skillId: "analyze-technicals", input: { ... } });
 */
export const Orchestrator = {
  /**
   * Execute a skill on the best available provider.
   * Applies fallback chain if primary is unavailable.
   */
  async execute(task: OrchestratorTask): Promise<AIResponse> {
    const skill = getSkill(task.skillId);
    const prompt = renderPrompt(skill.promptTemplate, task.input);

    // Determine fallback chain
    const chain = this.getChain(task, skill.preferredProvider);

    // Select provider
    const { provider, type, wasFallback, originalProvider } =
      await ProviderRegistry.selectProvider(chain);

    const request: AIRequest = {
      systemPrompt: skill.systemPrompt,
      prompt,
      outputSchema: skill.outputSchema,
      maxTokens: skill.maxTokens,
      temperature: skill.temperature,
      timeout: task.timeout,
    };

    try {
      const response = await provider.exec(request);
      return {
        ...response,
        provider: type,
        wasFallback,
        originalProvider,
      };
    } catch (error) {
      // Primary failed at runtime — try fallbacks
      if (!wasFallback) {
        ProviderRegistry.invalidateHealth(type);
        return this.executeFallback(request, chain, type);
      }
      throw error;
    }
  },

  /**
   * Execute with cross-verification from alternate providers.
   * Returns consensus result with verification details.
   */
  async executeWithVerification(
    task: OrchestratorTask,
  ): Promise<ConsensusResult> {
    // Execute primary
    const primary = await this.execute(task);

    // Determine verification config
    const verifyConfig = task.crossVerify
      ? { enabled: true, verifiers: task.verifierCount ?? 1 }
      : CROSS_VERIFY_TASKS[task.skillId] ?? { enabled: false, verifiers: 0 };

    if (!verifyConfig.enabled) {
      return {
        status: "unanimous",
        primary,
        verifications: [],
      };
    }

    // Dispatch verification to alternate providers
    const verifiers = ProviderRegistry.getVerifiers(
      primary.provider,
      verifyConfig.verifiers,
    );

    const skill = getSkill(task.skillId);
    const verifySkill = getSkill("verify-analysis");
    const verificationInput = {
      originalAnalysis: primary.text,
      rawData: renderPrompt(skill.promptTemplate, task.input),
    };

    const verifyPrompt = renderPrompt(
      verifySkill.promptTemplate,
      verificationInput,
    );

    const verifications = await Promise.allSettled(
      verifiers.map(async (verifier): Promise<VerificationResult> => {
        const request: AIRequest = {
          systemPrompt: verifySkill.systemPrompt,
          prompt: verifyPrompt,
          outputSchema: verifySkill.outputSchema,
          maxTokens: verifySkill.maxTokens,
          temperature: verifySkill.temperature,
          timeout: task.timeout ?? 90_000,
        };

        const response = await verifier.exec(request);
        const parsed = response.parsed as Record<string, unknown> | null;

        return {
          provider: verifier.type,
          agrees: parsed?.agrees === true,
          confidence: (parsed?.confidence as number) ?? 0.5,
          concerns: (parsed?.concerns as string[]) ?? [],
          alternative: parsed?.alternative as string | undefined,
        };
      }),
    );

    // Collect fulfilled results
    const fulfilled: VerificationResult[] = [];
    for (const result of verifications) {
      if (result.status === "fulfilled") {
        fulfilled.push(result.value);
      } else {
        console.warn(
          "[Orchestrator] Verification failed:",
          result.reason,
        );
      }
    }

    // Evaluate consensus
    return this.evaluateConsensus(primary, fulfilled);
  },

  /**
   * Execute a raw prompt (no skill) on a specific provider with fallbacks.
   * Used for Forum chat and ad-hoc requests.
   */
  async executeRaw(
    request: AIRequest,
    domain: string = "forum",
    providerOverride?: ProviderType,
  ): Promise<AIResponse> {
    const chain = providerOverride
      ? { primary: providerOverride, fallbacks: this.getFallbacksFor(providerOverride) }
      : DEFAULT_FALLBACK_CHAINS[domain] ?? DEFAULT_FALLBACK_CHAINS.forum;

    const { provider, type, wasFallback, originalProvider } =
      await ProviderRegistry.selectProvider(chain);

    try {
      const response = await provider.exec(request);
      return {
        ...response,
        provider: type,
        wasFallback,
        originalProvider,
      };
    } catch (error) {
      if (!wasFallback) {
        ProviderRegistry.invalidateHealth(type);
        return this.executeFallback(request, chain, type);
      }
      throw error;
    }
  },

  /** Try fallback providers after primary failure. */
  async executeFallback(
    request: AIRequest,
    chain: FallbackChain,
    failedProvider: ProviderType,
  ): Promise<AIResponse> {
    const remaining = chain.fallbacks.filter((t) => t !== failedProvider);

    for (const fallbackType of remaining) {
      try {
        const provider = ProviderRegistry.get(fallbackType);
        const response = await provider.exec(request);
        return {
          ...response,
          provider: fallbackType,
          wasFallback: true,
          originalProvider: chain.primary,
        };
      } catch {
        ProviderRegistry.invalidateHealth(fallbackType);
        continue;
      }
    }

    throw new Error(
      `All providers failed for task. Chain: ${chain.primary} -> ${chain.fallbacks.join(" -> ")}`,
    );
  },

  /** Get the fallback chain for a task. */
  getChain(task: OrchestratorTask, defaultProvider: ProviderType): FallbackChain {
    if (task.providerOverride) {
      return {
        primary: task.providerOverride,
        fallbacks: this.getFallbacksFor(task.providerOverride),
      };
    }

    // Look for a domain-level chain based on skill naming convention
    const domain = task.skillId.split("-")[0];
    return DEFAULT_FALLBACK_CHAINS[domain] ?? {
      primary: defaultProvider,
      fallbacks: this.getFallbacksFor(defaultProvider),
    };
  },

  /** Get fallbacks for a given provider (the other two). */
  getFallbacksFor(provider: ProviderType): ProviderType[] {
    const all: ProviderType[] = ["claude", "gemini", "codex"];
    return all.filter((t) => t !== provider);
  },

  /** Evaluate consensus from verification results. */
  evaluateConsensus(
    primary: AIResponse,
    verifications: VerificationResult[],
  ): ConsensusResult {
    if (verifications.length === 0) {
      return { status: "unanimous", primary, verifications: [] };
    }

    const agreeCount = verifications.filter((v) => v.agrees).length;
    const total = verifications.length;

    if (agreeCount === total) {
      return { status: "unanimous", primary, verifications };
    }

    if (agreeCount > total / 2) {
      const minority = verifications
        .filter((v) => !v.agrees)
        .flatMap((v) => v.concerns);
      return {
        status: "majority",
        primary,
        verifications,
        minorityConcerns: minority,
      };
    }

    return { status: "no_consensus", primary, verifications };
  },
};
