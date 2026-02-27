import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { assets, holdings } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { newId } from "@/lib/utils/id";

const AddHoldingSchema = z.object({
  symbol: z.string().min(1),
  name: z.string().min(1),
  assetClass: z.enum(["stock", "crypto", "metal"]),
  exchange: z.string().optional(),
  currency: z.string().default("USD"),
  quantity: z.number().positive(),
  costBasisPerUnit: z.number().nonnegative(),
  costBasisEur: z.number().nonnegative(),
  purchaseDate: z.string(), // ISO date
  notes: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const UpdateHoldingSchema = z.object({
  id: z.string(),
  quantity: z.number().positive().optional(),
  costBasisPerUnit: z.number().nonnegative().optional(),
  costBasisEur: z.number().nonnegative().optional(),
  notes: z.string().optional(),
});

const CloseHoldingSchema = z.object({
  id: z.string(),
  closedPricePerUnit: z.number().nonnegative(),
  closedPriceEur: z.number().nonnegative(),
});

/** GET /api/portfolio — list all open holdings with asset info. */
export async function GET() {
  const db = getDb();

  const rows = await db
    .select({
      holding: holdings,
      asset: assets,
    })
    .from(holdings)
    .innerJoin(assets, eq(holdings.assetId, assets.id))
    .where(eq(holdings.isClosed, false));

  const result = rows.map((r) => ({
    ...r.holding,
    asset: r.asset,
  }));

  return NextResponse.json(result);
}

/** POST /api/portfolio — add a new holding (creates asset if needed). */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = AddHoldingSchema.safeParse(body);

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
      exchange: data.exchange ?? null,
      currency: data.currency,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
    });
  }

  // Create holding
  const holdingId = newId();
  await db.insert(holdings).values({
    id: holdingId,
    assetId,
    quantity: data.quantity,
    costBasisPerUnit: data.costBasisPerUnit,
    costBasisEur: data.costBasisEur,
    purchaseDate: data.purchaseDate,
    notes: data.notes ?? null,
  });

  return NextResponse.json({ id: holdingId, assetId }, { status: 201 });
}

/** PATCH /api/portfolio — update an existing holding. */
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const parsed = UpdateHoldingSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { id, ...updates } = parsed.data;
  const db = getDb();

  const existing = await db
    .select()
    .from(holdings)
    .where(eq(holdings.id, id))
    .limit(1);

  if (existing.length === 0) {
    return NextResponse.json({ error: "Holding not found" }, { status: 404 });
  }

  await db
    .update(holdings)
    .set(updates)
    .where(eq(holdings.id, id));

  return NextResponse.json({ success: true });
}

/** DELETE /api/portfolio — soft-close a holding (sets closedAt, never deletes). */
export async function DELETE(req: NextRequest) {
  const body = await req.json();
  const parsed = CloseHoldingSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const db = getDb();

  await db
    .update(holdings)
    .set({
      isClosed: true,
      closedDate: new Date().toISOString(),
      closedPricePerUnit: data.closedPricePerUnit,
      closedPriceEur: data.closedPriceEur,
    })
    .where(eq(holdings.id, data.id));

  return NextResponse.json({ success: true });
}
