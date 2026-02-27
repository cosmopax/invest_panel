import { BaseAgent, type AgentConfig, type AgentRunResult } from "./base-agent";
import { getDb } from "@/lib/db";
import { knowledgeEntries } from "@/lib/db/schema";
import { newId } from "@/lib/utils/id";
import type { AIResponse, OrchestratorTask } from "@/lib/ai/types";

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
      skillId: "discover-knowledge",
      maxTokensOutput: parseInt(
        process.env.AGENT_LIBRARIAN_MAX_OUTPUT_TOKENS || "4000",
      ),
      schedule: process.env.AGENT_LIBRARIAN_CRON || "0 2 * * 1",
      crossVerify: false,
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

  buildTask(context: {
    existingTitles: string[];
    domainCounts: Record<string, number>;
  }): OrchestratorTask {
    const existingList = context.existingTitles.join(", ");
    const domainSummary = Object.entries(context.domainCounts)
      .map(([d, c]) => `${d}: ${c}`)
      .join(", ");

    return {
      skillId: "discover-knowledge",
      input: {
        existingTitles: existingList,
        domainSummary,
      },
    };
  }

  async processResponse(
    response: AIResponse,
  ): Promise<AgentRunResult & { newEntries: DiscoveredEntry[] }> {
    let newEntries: DiscoveredEntry[] = [];

    if (response.parsed && Array.isArray(response.parsed)) {
      newEntries = response.parsed as DiscoveredEntry[];
    } else {
      try {
        let jsonStr = response.text.trim();
        if (jsonStr.startsWith("```")) {
          jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
        }
        const parsed = JSON.parse(jsonStr);
        newEntries = Array.isArray(parsed) ? parsed : [];
      } catch {
        console.error("[Librarian] Failed to parse response as JSON");
      }
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

/** Create a Librarian agent instance. */
export function createLibrarian(): LibrarianAgent {
  return new LibrarianAgent();
}
