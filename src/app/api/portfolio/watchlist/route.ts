import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { assets, watchlist } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { newId } from "@/lib/utils/id";

const AddWatchlistSchema = z.object({
  symbol: z.string().min(1),
  name: z.string().min(1),
  assetClass: z.enum(["stock", "crypto", "metal"]),
  currency: z.string().default("USD"),
  targetPriceLow: z.number().optional(),
  targetPriceHigh: z.number().optional(),
  notes: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const RemoveWatchlistSchema = z.object({
  id: z.string(),
});

/** GET /api/portfolio/watchlist — list all watchlist items with asset info. */
export async function GET() {
  const db = getDb();

  const rows = await db
    .select({
      watchlistItem: watchlist,
      asset: assets,
    })
    .from(watchlist)
    .innerJoin(assets, eq(watchlist.assetId, assets.id));

  const result = rows.map((r) => ({
    ...r.watchlistItem,
    asset: r.asset,
  }));

  return NextResponse.json(result);
}

/** POST /api/portfolio/watchlist — add asset to watchlist. */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = AddWatchlistSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const db = getDb();

  // Find or create asset
  const existing = await db
    .select()
    .from(assets)
    .where(
      and(
        eq(assets.symbol, data.symbol),
        eq(assets.assetClass, data.assetClass),
      ),
    )
    .limit(1);

  let assetId: string;
  if (existing.length > 0) {
    assetId = existing[0].id;
  } else {
    assetId = newId();
    await db.insert(assets).values({
      id: assetId,
      symbol: data.symbol,
      name: data.name,
      assetClass: data.assetClass,
      currency: data.currency,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
    });
  }

  // Check if already on watchlist
  const alreadyWatched = await db
    .select()
    .from(watchlist)
    .where(eq(watchlist.assetId, assetId))
    .limit(1);

  if (alreadyWatched.length > 0) {
    return NextResponse.json(
      { error: "Asset already on watchlist" },
      { status: 409 },
    );
  }

  const watchlistId = newId();
  await db.insert(watchlist).values({
    id: watchlistId,
    assetId,
    targetPriceLow: data.targetPriceLow ?? null,
    targetPriceHigh: data.targetPriceHigh ?? null,
    notes: data.notes ?? null,
  });

  return NextResponse.json({ id: watchlistId, assetId }, { status: 201 });
}

/** DELETE /api/portfolio/watchlist — remove from watchlist. */
export async function DELETE(req: NextRequest) {
  const body = await req.json();
  const parsed = RemoveWatchlistSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const db = getDb();

  // DECISION: Watchlist removal is a true delete (not soft-delete).
  // Unlike holdings, watchlist items have no financial history to preserve.
  await db.delete(watchlist).where(eq(watchlist.id, parsed.data.id));

  return NextResponse.json({ success: true });
}
