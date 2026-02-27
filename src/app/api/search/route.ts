import { NextRequest, NextResponse } from "next/server";
import * as finnhub from "@/lib/services/finnhub";
import * as coingecko from "@/lib/services/coingecko";
import * as metalsDev from "@/lib/services/metals-dev";

/** GET /api/search?q=apple&class=stock — search for assets by query. */
export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");
  const assetClass = req.nextUrl.searchParams.get("class");

  if (!query || query.length < 1) {
    return NextResponse.json(
      { error: "Missing 'q' query parameter" },
      { status: 400 },
    );
  }

  try {
    const results: Array<{
      symbol: string;
      name: string;
      assetClass: string;
      exchange?: string;
      currency: string;
    }> = [];

    if (!assetClass || assetClass === "stock") {
      const finnhubResults = await finnhub.searchSymbol(query);
      for (const r of finnhubResults.result.slice(0, 10)) {
        results.push({
          symbol: r.symbol,
          name: r.description,
          assetClass: "stock",
          exchange: r.type,
          currency: "USD", // Default; getProfile can refine
        });
      }
    }

    if (!assetClass || assetClass === "crypto") {
      const cgResults = await coingecko.searchCoins(query);
      for (const c of cgResults.coins.slice(0, 10)) {
        results.push({
          symbol: c.symbol.toUpperCase(),
          name: c.name,
          assetClass: "crypto",
          currency: "EUR",
        });
      }
    }

    if (!assetClass || assetClass === "metal") {
      const metalSymbols = metalsDev.getSupportedMetals();
      const q = query.toUpperCase();
      for (const sym of metalSymbols) {
        const name = metalsDev.getMetalName(sym);
        if (sym.includes(q) || name.toUpperCase().includes(q)) {
          results.push({
            symbol: sym,
            name,
            assetClass: "metal",
            currency: "EUR",
          });
        }
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("[Search]", error);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 },
    );
  }
}
