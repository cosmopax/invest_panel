import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { assets } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import * as finnhub from "@/lib/services/finnhub";
import * as coingecko from "@/lib/services/coingecko";

const RANGE_TO_DAYS: Record<string, number> = {
  "1W": 7,
  "1M": 30,
  "3M": 90,
  "6M": 180,
  "1Y": 365,
  All: 365 * 3,
};

/** GET /api/prices/history?symbol=AAPL&class=stock&range=1M */
export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  const assetClass = req.nextUrl.searchParams.get("class");
  const range = req.nextUrl.searchParams.get("range") || "1M";

  if (!symbol || !assetClass) {
    return NextResponse.json(
      { error: "Missing 'symbol' or 'class' parameter" },
      { status: 400 },
    );
  }

  const days = RANGE_TO_DAYS[range];
  if (!days) {
    return NextResponse.json(
      { error: `Invalid range: ${range}. Use: ${Object.keys(RANGE_TO_DAYS).join(", ")}` },
      { status: 400 },
    );
  }

  try {
    if (assetClass === "stock") {
      const now = Math.floor(Date.now() / 1000);
      const from = now - days * 86400;
      const resolution = days <= 30 ? "D" : "W";
      const candles = await finnhub.getCandles(symbol, resolution, from, now);

      if (candles.s === "no_data") {
        return NextResponse.json({ data: [], symbol, range });
      }

      const data = candles.t.map((t, i) => ({
        time: t,
        open: candles.o[i],
        high: candles.h[i],
        low: candles.l[i],
        close: candles.c[i],
        volume: candles.v[i],
      }));

      return NextResponse.json({ data, symbol, range, currency: "USD" });
    }

    if (assetClass === "crypto") {
      // Find CoinGecko ID from asset metadata
      const db = getDb();
      const asset = await db
        .select()
        .from(assets)
        .where(and(eq(assets.symbol, symbol), eq(assets.assetClass, "crypto")))
        .limit(1);

      const cgId = asset.length > 0
        ? ((asset[0].metadata as Record<string, unknown>)?.coingeckoId as string) || symbol.toLowerCase()
        : symbol.toLowerCase();

      const chart = await coingecko.getMarketChart(cgId, days);

      const data = chart.prices.map(([t, p]) => ({
        time: Math.floor(t / 1000),
        close: p,
      }));

      return NextResponse.json({ data, symbol, range, currency: "EUR" });
    }

    // Metals: no free historical API, return empty
    // DECISION: Metals.Dev free tier has no historical endpoint.
    // Historical metal prices would require a premium API or manual data entry.
    return NextResponse.json({
      data: [],
      symbol,
      range,
      note: "Historical data not available for metals on free tier",
    });
  } catch (error) {
    console.error(`[PriceHistory] ${symbol}:`, error);
    return NextResponse.json(
      { error: "Failed to fetch price history" },
      { status: 500 },
    );
  }
}
