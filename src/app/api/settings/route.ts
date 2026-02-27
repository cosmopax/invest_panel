import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/** API keys we track status for. */
const API_KEYS = [
  { key: "FINNHUB_API_KEY", label: "Finnhub", env: "FINNHUB_API_KEY" },
  { key: "COINGECKO_API_KEY", label: "CoinGecko", env: "COINGECKO_API_KEY" },
  { key: "METALS_DEV_API_KEY", label: "Metals.Dev", env: "METALS_DEV_API_KEY" },
  { key: "GOLDAPI_KEY", label: "GoldAPI", env: "GOLDAPI_KEY" },
  { key: "ANTHROPIC_API_KEY", label: "Anthropic", env: "ANTHROPIC_API_KEY" },
] as const;

const UpdateSettingSchema = z.object({
  key: z.string().min(1),
  value: z.unknown(),
});

/** GET /api/settings — get API key status and app config. */
export async function GET() {
  const db = getDb();

  // API key status (configured or not — never expose actual keys)
  const apiKeyStatus = API_KEYS.map((k) => ({
    key: k.key,
    label: k.label,
    configured: !!process.env[k.env],
    // DECISION: We only check env vars, not DB-stored keys.
    // API keys live in .env.local for security. The settings table
    // stores user preferences and app config, not secrets.
  }));

  // App settings from DB
  const allSettings = await db.select().from(settings);
  const settingsMap: Record<string, unknown> = {};
  for (const s of allSettings) {
    settingsMap[s.key] = s.value;
  }

  return NextResponse.json({
    apiKeys: apiKeyStatus,
    settings: settingsMap,
    env: {
      baseCurrency: process.env.NEXT_PUBLIC_BASE_CURRENCY || "EUR",
      timezone: process.env.NEXT_PUBLIC_TIMEZONE || "Europe/Vienna",
      agentEnabled: process.env.AGENT_ENABLED === "true",
    },
  });
}

/** PATCH /api/settings — update a setting. */
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const parsed = UpdateSettingSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { key, value } = parsed.data;
  const db = getDb();

  await db
    .insert(settings)
    .values({
      key,
      value: JSON.stringify(value),
      updatedAt: new Date().toISOString(),
    })
    .onConflictDoUpdate({
      target: settings.key,
      set: {
        value: JSON.stringify(value),
        updatedAt: new Date().toISOString(),
      },
    });

  return NextResponse.json({ success: true });
}
