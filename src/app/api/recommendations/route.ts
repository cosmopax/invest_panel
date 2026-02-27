import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { recommendations } from "@/lib/db/schema";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";

/**
 * GET /api/recommendations
 * Query params:
 *   type     - 'opportunity' | 'risk_warning' | 'rebalance' | 'macro_thesis'
 *   status   - 'active' | 'expired' | 'validated' | 'invalidated'
 *   agentId  - 'scout' | 'strategist'
 *   minConf  - minimum confidence (0-1)
 *   maxConf  - maximum confidence (0-1)
 *   horizon  - 'days' | 'weeks' | 'months' | 'quarters'
 *   limit    - number (default 50)
 *   offset   - number (default 0)
 *   history  - 'true' to include non-active (expired/validated/invalidated)
 */
export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const params = request.nextUrl.searchParams;

    const type = params.get("type");
    const status = params.get("status");
    const agentId = params.get("agentId");
    const minConf = params.get("minConf");
    const maxConf = params.get("maxConf");
    const horizon = params.get("horizon");
    const limit = parseInt(params.get("limit") || "50");
    const offset = parseInt(params.get("offset") || "0");
    const showHistory = params.get("history") === "true";

    const conditions = [];

    if (type) {
      conditions.push(eq(recommendations.type, type));
    }
    if (status) {
      conditions.push(eq(recommendations.status, status));
    } else if (!showHistory) {
      conditions.push(eq(recommendations.status, "active"));
    }
    if (agentId) {
      conditions.push(eq(recommendations.agentId, agentId));
    }
    if (minConf) {
      conditions.push(gte(recommendations.confidence, parseFloat(minConf)));
    }
    if (maxConf) {
      conditions.push(lte(recommendations.confidence, parseFloat(maxConf)));
    }
    if (horizon) {
      conditions.push(eq(recommendations.timeHorizon, horizon));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const items = await db
      .select()
      .from(recommendations)
      .where(where)
      .orderBy(desc(recommendations.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(recommendations)
      .where(where);

    // Get accuracy stats
    const accuracyStats = await db
      .select({
        agentId: recommendations.agentId,
        avgAccuracy: sql<number>`avg(accuracy_score)`,
        totalScored: sql<number>`count(accuracy_score)`,
        totalActive: sql<number>`sum(case when status = 'active' then 1 else 0 end)`,
      })
      .from(recommendations)
      .groupBy(recommendations.agentId);

    return NextResponse.json({
      items,
      total: countResult[0]?.count ?? 0,
      accuracyStats,
    });
  } catch (error) {
    console.error("[API] GET /api/recommendations failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch recommendations" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/recommendations
 * Body: { id, status?, outcomeNotes?, accuracyScore?, reviewedAt? }
 */
export async function PATCH(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};

    if (updates.status !== undefined) {
      updateData.status = updates.status;
    }
    if (updates.outcomeNotes !== undefined) {
      updateData.outcomeNotes = updates.outcomeNotes;
    }
    if (updates.accuracyScore !== undefined) {
      updateData.accuracyScore = Math.max(
        0,
        Math.min(1, updates.accuracyScore),
      );
    }
    if (updates.reviewedAt !== undefined) {
      updateData.reviewedAt = updates.reviewedAt;
    } else if (updates.status === "validated" || updates.status === "invalidated") {
      updateData.reviewedAt = new Date().toISOString();
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid update fields provided" },
        { status: 400 },
      );
    }

    await db
      .update(recommendations)
      .set(updateData)
      .where(eq(recommendations.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] PATCH /api/recommendations failed:", error);
    return NextResponse.json(
      { error: "Failed to update recommendation" },
      { status: 500 },
    );
  }
}
