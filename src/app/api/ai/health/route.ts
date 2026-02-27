import { NextResponse } from "next/server";
import { ProviderRegistry } from "@/lib/ai/registry";

/**
 * GET /api/ai/health
 * Returns health status of all AI providers.
 */
export async function GET() {
  try {
    const results = await ProviderRegistry.checkAllHealth();

    const summary = {
      providers: results.map((r) => ({
        provider: r.provider,
        status: r.status,
        latencyMs: r.latencyMs,
        error: r.error,
        checkedAt: r.checkedAt,
      })),
      availableCount: results.filter((r) => r.status === "available").length,
      totalCount: results.length,
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error("[API] GET /api/ai/health failed:", error);
    return NextResponse.json(
      { error: "Health check failed" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/ai/health
 * Force refresh health checks (invalidates cache).
 */
export async function POST() {
  try {
    ProviderRegistry.invalidateAllHealth();
    const results = await ProviderRegistry.checkAllHealth();

    return NextResponse.json({
      providers: results,
      refreshed: true,
    });
  } catch (error) {
    console.error("[API] POST /api/ai/health failed:", error);
    return NextResponse.json(
      { error: "Health refresh failed" },
      { status: 500 },
    );
  }
}
