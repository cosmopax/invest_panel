import { NextRequest, NextResponse } from "next/server";
import { getDb, getSqlite } from "@/lib/db";
import { conversations, messages } from "@/lib/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { newId } from "@/lib/utils/id";

/**
 * GET /api/conversations
 * Query params:
 *   id     - single conversation with messages
 *   q      - FTS5 search across message content
 *   type   - filter by conversation type
 *   limit  - number (default 50)
 */
export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const params = request.nextUrl.searchParams;

    const id = params.get("id");
    const query = params.get("q");
    const type = params.get("type");
    const limit = parseInt(params.get("limit") || "50");

    // Single conversation with messages
    if (id) {
      const conv = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, id))
        .limit(1);

      if (conv.length === 0) {
        return NextResponse.json(
          { error: "Conversation not found" },
          { status: 404 },
        );
      }

      const msgs = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, id))
        .orderBy(messages.createdAt);

      return NextResponse.json({
        conversation: conv[0],
        messages: msgs,
      });
    }

    // FTS5 search across messages
    if (query && query.length >= 2) {
      const sqlite = getSqlite();
      const results = sqlite
        .prepare(
          `SELECT DISTINCT m.conversation_id, c.title, c.type, c.created_at, c.updated_at,
                  (SELECT COUNT(*) FROM messages m2 WHERE m2.conversation_id = c.id) as message_count
           FROM messages_fts f
           JOIN messages m ON m.rowid = f.rowid
           JOIN conversations c ON m.conversation_id = c.id
           WHERE c.is_archived = 0 AND messages_fts MATCH ?
           ORDER BY c.updated_at DESC
           LIMIT ?`,
        )
        .all(query, limit);

      return NextResponse.json({ conversations: results });
    }

    // List conversations
    const conditions = [eq(conversations.isArchived, false)];
    if (type) {
      conditions.push(eq(conversations.type, type));
    }

    const convList = await db
      .select({
        id: conversations.id,
        title: conversations.title,
        type: conversations.type,
        isArchived: conversations.isArchived,
        createdAt: conversations.createdAt,
        updatedAt: conversations.updatedAt,
        messageCount: sql<number>`(SELECT COUNT(*) FROM messages WHERE conversation_id = ${conversations.id})`,
      })
      .from(conversations)
      .where(and(...conditions))
      .orderBy(desc(conversations.updatedAt))
      .limit(limit);

    return NextResponse.json({ conversations: convList });
  } catch (error) {
    console.error("[API] GET /api/conversations failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/conversations
 * Body: { title, type? }
 */
export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();
    const { title, type = "general" } = body;

    if (!title) {
      return NextResponse.json(
        { error: "title is required" },
        { status: 400 },
      );
    }

    const id = newId();
    await db.insert(conversations).values({
      id,
      title,
      type,
    });

    return NextResponse.json({ id, title, type });
  } catch (error) {
    console.error("[API] POST /api/conversations failed:", error);
    return NextResponse.json(
      { error: "Failed to create conversation" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/conversations
 * Body: { id, title?, isArchived? }
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
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.isArchived !== undefined)
      updateData.isArchived = updates.isArchived;
    updateData.updatedAt = new Date().toISOString();

    await db
      .update(conversations)
      .set(updateData)
      .where(eq(conversations.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] PATCH /api/conversations failed:", error);
    return NextResponse.json(
      { error: "Failed to update conversation" },
      { status: 500 },
    );
  }
}
