import { NextRequest, NextResponse } from "next/server";
import { getDb, getSqlite } from "@/lib/db";
import { newsItems } from "@/lib/db/schema";
import { desc, eq, and, gte, sql } from "drizzle-orm";

/** GET /api/news — Fetch news items with optional filters. */
export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(params.get("limit") || "50"), 100);
    const offset = parseInt(params.get("offset") || "0");
    const category = params.get("category");
    const sentiment = params.get("sentiment");
    const minQuality = params.get("minQuality")
      ? parseInt(params.get("minQuality")!)
      : null;
    const search = params.get("q");

    // FTS5 search path
    if (search) {
      const sqlite = getSqlite();
      const rows = sqlite
        .prepare(
          `SELECT n.*,
                  highlight(news_fts, 0, '<mark>', '</mark>') as highlighted_title
           FROM news_fts f
           JOIN news_items n ON n.rowid = f.rowid
           WHERE news_fts MATCH ?
           ORDER BY rank
           LIMIT ? OFFSET ?`,
        )
        .all(search, limit, offset);

      return NextResponse.json({ items: rows, total: rows.length });
    }

    // Regular filtered query
    const db = getDb();
    const conditions = [];

    if (category) {
      conditions.push(eq(newsItems.category, category));
    }
    if (sentiment) {
      conditions.push(eq(newsItems.sentiment, sentiment));
    }
    if (minQuality) {
      conditions.push(gte(newsItems.sourceQuality, minQuality));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const items = await db
      .select()
      .from(newsItems)
      .where(where)
      .orderBy(desc(newsItems.publishedAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(newsItems)
      .where(where);

    return NextResponse.json({
      items,
      total: countResult[0]?.count ?? 0,
    });
  } catch (error) {
    console.error("[API] GET /api/news error:", error);
    return NextResponse.json(
      { error: "Failed to fetch news" },
      { status: 500 },
    );
  }
}

/** PATCH /api/news — Update a news item (mark read, bookmark, etc.). */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, isRead, isBookmarked } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Missing news item id" },
        { status: 400 },
      );
    }

    const db = getDb();
    const updates: Record<string, unknown> = {};
    if (typeof isRead === "boolean") updates.isRead = isRead;
    if (typeof isBookmarked === "boolean") updates.isBookmarked = isBookmarked;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No updates provided" },
        { status: 400 },
      );
    }

    await db.update(newsItems).set(updates).where(eq(newsItems.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] PATCH /api/news error:", error);
    return NextResponse.json(
      { error: "Failed to update news item" },
      { status: 500 },
    );
  }
}
