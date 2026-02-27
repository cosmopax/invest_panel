import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { assets } from "@/lib/db/schema";
import { inArray } from "drizzle-orm";
import { getBatchPrices, getPrice } from "@/lib/services/price-service";

/** GET /api/prices?symbols=AAPL,BTC,XAU — batch price fetch. */
export async function GET(req: NextRequest) {
  const symbolsParam = req.nextUrl.searchParams.get("symbols");

  if (!symbolsParam) {
    return NextResponse.json(
      { error: "Missing 'symbols' query parameter" },
      { status: 400 },
    );
  }

  const symbolList = symbolsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (symbolList.length === 0) {
    return NextResponse.json(
      { error: "No valid symbols provided" },
      { status: 400 },
    );
  }

  const db = getDb();

  // Find matching assets
  const matchedAssets = await db
    .select()
    .from(assets)
    .where(inArray(assets.symbol, symbolList));

  if (matchedAssets.length === 0) {
    return NextResponse.json(
      { error: "No matching assets found", symbols: symbolList },
      { status: 404 },
    );
  }

  // Batch fetch prices
  const priceMap = await getBatchPrices(matchedAssets);

  const result: Record<string, unknown> = {};
  for (const [assetId, price] of priceMap.entries()) {
    result[price.symbol] = {
      assetId,
      priceEur: price.priceEur,
      priceOriginal: price.priceOriginal,
      currency: price.currency,
      change24h: price.change24h,
      changePercent24h: price.changePercent24h,
      timestamp: price.timestamp,
      source: price.source,
    };
  }

  return NextResponse.json(result);
}
