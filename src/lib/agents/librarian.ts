import Anthropic from "@anthropic-ai/sdk";
import { BaseAgent, type AgentConfig, type AgentRunResult } from "./base-agent";
import { MODELS } from "@/lib/ai/claude-client";
import { getDb } from "@/lib/db";
import { knowledgeEntries } from "@/lib/db/schema";
import { newId } from "@/lib/utils/id";
import { sql } from "drizzle-orm";

/** Structure for a new knowledge entry discovered by Librarian. */
interface DiscoveredEntry {
  title: string;
  slug: string;
  domain: string;
  subdomain?: string;
  summary: string;
  explanation: string;
  mathematicalFormulation?: string;
  practicalApplication: string;
  limitations?: string;
  authors?: string[];
  year?: number;
  tags?: string[];
}

/** Librarian agent — discovers and curates knowledge entries. */
export class LibrarianAgent extends BaseAgent {
  constructor() {
    const config: AgentConfig = {
      id: "librarian",
      name: "Librarian",
      model: MODELS.routine,
      maxTokensOutput: parseInt(
        process.env.AGENT_LIBRARIAN_MAX_OUTPUT_TOKENS || "4000",
      ),
      schedule: process.env.AGENT_LIBRARIAN_CRON || "0 2 * * 1",
    };
    super(config);
  }

  async gatherContext(): Promise<{
    existingTitles: string[];
    existingSlugs: string[];
    domainCounts: Record<string, number>;
  }> {
    const db = getDb();

    const entries = await db
      .select({
        title: knowledgeEntries.title,
        slug: knowledgeEntries.slug,
        domain: knowledgeEntries.domain,
      })
      .from(knowledgeEntries);

    const domainCounts: Record<string, number> = {};
    for (const e of entries) {
      domainCounts[e.domain] = (domainCounts[e.domain] || 0) + 1;
    }

    return {
      existingTitles: entries.map((e) => e.title),
      existingSlugs: entries.map((e) => e.slug),
      domainCounts,
    };
  }

  getSystemPrompt(): string {
    return `You are Librarian, a knowledge curator for the MERIDIAN investment research platform. Your job is to discover and formulate new knowledge entries about financial concepts, models, and frameworks.

Each entry must follow this JSON schema:

{
  "title": "Entry title",
  "slug": "url-friendly-slug",
  "domain": "financial_math" | "behavioral_econ" | "macro" | "futures_studies" | "game_theory" | "complexity",
  "subdomain": "specific subdomain",
  "summary": "2-3 sentence overview",
  "explanation": "Full multi-paragraph explanation in markdown. Include historical context, key concepts, and how it relates to financial markets.",
  "mathematicalFormulation": "LaTeX/KaTeX notation (or null if not applicable)",
  "practicalApplication": "How to apply this concept to personal investing. Be specific and actionable.",
  "limitations": "Known limitations and critiques",
  "authors": ["Original author names"],
  "year": 1970,
  "tags": ["relevant", "tags"]
}

QUALITY STANDARDS:
- Explanations should be 200-400 words, educational but not simplistic
- Mathematical formulations should use proper LaTeX
- Practical applications must be specific to individual investors (not institutional)
- Include both foundational classics and emerging concepts
- Focus on concepts with genuine investment applicability

Return a JSON array of 2-3 new entries. Prioritize domains with fewer entries.
Return ONLY valid JSON. No explanatory text.`;
  }

  buildMessages(context: {
    existingTitles: string[];
    existingSlugs: string[];
    domainCounts: Record<string, number>;
  }): Anthropic.MessageParam[] {
    const existingList = context.existingTitles.join(", ");
    const domainSummary = Object.entries(context.domainCounts)
      .map(([d, c]) => `${d}: ${c}`)
      .join(", ");

    return [
      {
        role: "user",
        content: `The knowledge library currently has these entries: ${existingList}

Domain distribution: ${domainSummary}

Generate 2-3 NEW entries that do NOT duplicate existing content. Prioritize underrepresented domains. Focus on concepts with clear investment applicability.`,
      },
    ];
  }

  async processResponse(
    response: Anthropic.Message,
  ): Promise<AgentRunResult & { newEntries: DiscoveredEntry[] }> {
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return {
        itemsProcessed: 0,
        itemsCreated: 0,
        summary: "No text response from Claude",
        newEntries: [],
      };
    }

    let newEntries: DiscoveredEntry[] = [];
    try {
      let jsonStr = textBlock.text.trim();
      if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }
      newEntries = JSON.parse(jsonStr);
      if (!Array.isArray(newEntries)) newEntries = [];
    } catch {
      console.error("[Librarian] Failed to parse response as JSON");
    }

    return {
      itemsProcessed: newEntries.length,
      itemsCreated: 0,
      summary: `Discovered ${newEntries.length} new entries`,
      newEntries,
    };
  }

  async persistResults(
    result: AgentRunResult & { newEntries?: DiscoveredEntry[] },
  ): Promise<void> {
    if (!result.newEntries?.length) return;

    const db = getDb();
    let inserted = 0;

    for (const entry of result.newEntries) {
      try {
        await db.insert(knowledgeEntries).values({
          id: newId(),
          title: entry.title,
          slug: entry.slug,
          domain: entry.domain,
          subdomain: entry.subdomain || null,
          summary: entry.summary,
          explanation: entry.explanation,
          mathematicalFormulation: entry.mathematicalFormulation || null,
          practicalApplication: entry.practicalApplication,
          limitations: entry.limitations || null,
          authors: entry.authors || null,
          year: entry.year || null,
          tags: entry.tags || null,
          relatedEntries: [],
          addedBy: "librarian",
          isVerified: false,
          qualityScore: 0.7,
        });
        inserted++;
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes("UNIQUE constraint")
        ) {
          continue;
        }
        console.error("[Librarian] Insert failed:", error);
      }
    }

    result.itemsCreated = inserted;
    result.summary = `Discovered ${result.newEntries.length}, inserted ${inserted} new entries`;
  }
}

export function createLibrarian(): LibrarianAgent {
  return new LibrarianAgent();
}
