import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { agentRuns } from "@/lib/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { triggerAgent, getSchedulerStatus } from "@/lib/agents/scheduler";

/** GET /api/agents — Get agent runs history and scheduler status. */
export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const agentId = params.get("agentId");
    const limit = Math.min(parseInt(params.get("limit") || "20"), 100);

    const db = getDb();

    const where = agentId ? eq(agentRuns.agentId, agentId) : undefined;

    const runs = await db
      .select()
      .from(agentRuns)
      .where(where)
      .orderBy(desc(agentRuns.startedAt))
      .limit(limit);

    // Get aggregate stats per agent
    const stats = await db
      .select({
        agentId: agentRuns.agentId,
        totalRuns: sql<number>`count(*)`,
        successfulRuns: sql<number>`sum(case when status = 'completed' then 1 else 0 end)`,
        failedRuns: sql<number>`sum(case when status = 'failed' then 1 else 0 end)`,
        totalTokensInput: sql<number>`sum(tokens_input)`,
        totalTokensOutput: sql<number>`sum(tokens_output)`,
        totalCostUsd: sql<number>`sum(estimated_cost_usd)`,
        avgDurationMs: sql<number>`avg(duration_ms)`,
      })
      .from(agentRuns)
      .groupBy(agentRuns.agentId);

    const schedulerStatus = getSchedulerStatus();

    return NextResponse.json({ runs, stats, schedulerStatus });
  } catch (error) {
    console.error("[API] GET /api/agents error:", error);
    return NextResponse.json(
      { error: "Failed to fetch agent data" },
      { status: 500 },
    );
  }
}

/** POST /api/agents — Manually trigger an agent run. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentId } = body;

    if (!agentId) {
      return NextResponse.json(
        { error: "Missing agentId" },
        { status: 400 },
      );
    }

    const result = await triggerAgent(agentId);
    return NextResponse.json({ success: true, result });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[API] POST /api/agents error:", msg);

    if (msg.includes("Unknown agent")) {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    if (msg.includes("not configured")) {
      return NextResponse.json(
        { error: "API key not configured for this agent" },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { error: "Agent run failed: " + msg },
      { status: 500 },
    );
  }
}
