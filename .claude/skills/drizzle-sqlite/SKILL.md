---
name: drizzle-sqlite
description: 'Drizzle ORM with SQLite patterns for MERIDIAN. Use this skill whenever creating or modifying database schema, writing queries, setting up FTS5 full-text search, configuring WAL mode, running migrations, or working with better-sqlite3. Also use when implementing JSON columns, indexes, or any database-related code.'
---

# Drizzle + SQLite Patterns for MERIDIAN

## Schema Conventions

All tables in a single `src/lib/db/schema.ts`. Use Drizzle's SQLite column types:

```typescript
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

// Timestamps as ISO 8601 text, not unix integers
createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),

// JSON columns as text with manual serialize/deserialize
metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>(),

// Enums as text with type union
assetType: text("asset_type").$type<"stock" | "crypto" | "metal">().notNull(),
```

## FTS5 Setup

Drizzle doesn't support virtual tables. Create FTS5 tables via raw SQL at connection time:

```typescript
// In src/lib/db/index.ts
db.run(sql`
  CREATE VIRTUAL TABLE IF NOT EXISTS news_fts
  USING fts5(title, summary, content='news_items', content_rowid='id');
`);

// Keep FTS in sync with triggers
db.run(sql`
  CREATE TRIGGER IF NOT EXISTS news_ai AFTER INSERT ON news_items BEGIN
    INSERT INTO news_fts(rowid, title, summary) VALUES (new.id, new.title, new.summary);
  END;
`);
```

## Connection Setup

```typescript
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

const sqlite = new Database(process.env.DATABASE_URL?.replace("file:", "") || "./data/meridian.db");
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
sqlite.pragma("busy_timeout = 5000");

export const db = drizzle(sqlite, { schema });
```

## Query Patterns

Always use Drizzle's query builder. Raw SQL only for FTS5 queries:

```typescript
// Drizzle query builder (preferred)
const holdings = await db.select().from(assets).where(eq(assets.assetType, "stock"));

// FTS5 search (raw SQL required)
const results = db.all(sql`
  SELECT rowid, highlight(news_fts, 0, '<b>', '</b>') as title
  FROM news_fts WHERE news_fts MATCH ${query}
  ORDER BY rank LIMIT 20
`);
```

## Transactions

All mutations wrapped in transactions:

```typescript
await db.transaction(async (tx) => {
  await tx.insert(holdings).values(newHolding);
  await tx.update(portfolio).set({ updatedAt: new Date().toISOString() });
});
```

## Migrations

Run `npx drizzle-kit push` for development. Generate migration files with `npx drizzle-kit generate` for production tracking.
