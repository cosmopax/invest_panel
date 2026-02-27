import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import { existsSync, mkdirSync } from "fs";
import { dirname } from "path";

const DATABASE_PATH = process.env.DATABASE_URL?.replace("file:", "") || "./data/meridian.db";

/** Ensure the data directory exists before opening the database. */
function ensureDataDir(): void {
  const dir = dirname(DATABASE_PATH);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/** Create and configure the SQLite connection with WAL mode. */
function createConnection(): Database.Database {
  ensureDataDir();
  const sqlite = new Database(DATABASE_PATH);

  // Enable WAL mode for concurrent reads during agent writes
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("busy_timeout = 5000");
  sqlite.pragma("foreign_keys = ON");

  return sqlite;
}

/** Initialize FTS5 virtual tables and sync triggers. */
function initializeFts(sqlite: Database.Database): void {
  // FTS5 for news items
  sqlite.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS news_fts USING fts5(
      title, summary, content,
      content='news_items', content_rowid='rowid'
    );
  `);

  // FTS5 for knowledge entries
  sqlite.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS knowledge_fts USING fts5(
      title, summary, explanation, practical_application,
      content='knowledge_entries', content_rowid='rowid'
    );
  `);

  // FTS5 for messages
  sqlite.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
      content,
      content='messages', content_rowid='rowid'
    );
  `);

  // Sync triggers — news_items
  sqlite.exec(`
    CREATE TRIGGER IF NOT EXISTS news_ai AFTER INSERT ON news_items BEGIN
      INSERT INTO news_fts(rowid, title, summary, content)
      VALUES (new.rowid, new.title, new.summary, new.content);
    END;
  `);
  sqlite.exec(`
    CREATE TRIGGER IF NOT EXISTS news_ad AFTER DELETE ON news_items BEGIN
      INSERT INTO news_fts(news_fts, rowid, title, summary, content)
      VALUES ('delete', old.rowid, old.title, old.summary, old.content);
    END;
  `);
  sqlite.exec(`
    CREATE TRIGGER IF NOT EXISTS news_au AFTER UPDATE ON news_items BEGIN
      INSERT INTO news_fts(news_fts, rowid, title, summary, content)
      VALUES ('delete', old.rowid, old.title, old.summary, old.content);
      INSERT INTO news_fts(rowid, title, summary, content)
      VALUES (new.rowid, new.title, new.summary, new.content);
    END;
  `);

  // Sync triggers — knowledge_entries
  sqlite.exec(`
    CREATE TRIGGER IF NOT EXISTS knowledge_ai AFTER INSERT ON knowledge_entries BEGIN
      INSERT INTO knowledge_fts(rowid, title, summary, explanation, practical_application)
      VALUES (new.rowid, new.title, new.summary, new.explanation, new.practical_application);
    END;
  `);
  sqlite.exec(`
    CREATE TRIGGER IF NOT EXISTS knowledge_ad AFTER DELETE ON knowledge_entries BEGIN
      INSERT INTO knowledge_fts(knowledge_fts, rowid, title, summary, explanation, practical_application)
      VALUES ('delete', old.rowid, old.title, old.summary, old.explanation, old.practical_application);
    END;
  `);
  sqlite.exec(`
    CREATE TRIGGER IF NOT EXISTS knowledge_au AFTER UPDATE ON knowledge_entries BEGIN
      INSERT INTO knowledge_fts(knowledge_fts, rowid, title, summary, explanation, practical_application)
      VALUES ('delete', old.rowid, old.title, old.summary, old.explanation, old.practical_application);
      INSERT INTO knowledge_fts(rowid, title, summary, explanation, practical_application)
      VALUES (new.rowid, new.title, new.summary, new.explanation, new.practical_application);
    END;
  `);

  // Sync triggers — messages
  sqlite.exec(`
    CREATE TRIGGER IF NOT EXISTS messages_ai AFTER INSERT ON messages BEGIN
      INSERT INTO messages_fts(rowid, content) VALUES (new.rowid, new.content);
    END;
  `);
  sqlite.exec(`
    CREATE TRIGGER IF NOT EXISTS messages_ad AFTER DELETE ON messages BEGIN
      INSERT INTO messages_fts(messages_fts, rowid, content)
      VALUES ('delete', old.rowid, old.content);
    END;
  `);
  sqlite.exec(`
    CREATE TRIGGER IF NOT EXISTS messages_au AFTER UPDATE ON messages BEGIN
      INSERT INTO messages_fts(messages_fts, rowid, content)
      VALUES ('delete', old.rowid, old.content);
      INSERT INTO messages_fts(rowid, content) VALUES (new.rowid, new.content);
    END;
  `);
}

// Singleton connection
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let _sqlite: Database.Database | null = null;

/** Get the Drizzle database instance (singleton). */
export function getDb() {
  if (!_db) {
    _sqlite = createConnection();
    _db = drizzle(_sqlite, { schema });
    initializeFts(_sqlite);
  }
  return _db;
}

/** Get the raw better-sqlite3 instance for FTS5 queries. */
export function getSqlite(): Database.Database {
  if (!_sqlite) {
    getDb(); // Ensures _sqlite is initialized
  }
  return _sqlite!;
}

/** Close the database connection gracefully. */
export function closeDb(): void {
  if (_sqlite) {
    _sqlite.close();
    _sqlite = null;
    _db = null;
  }
}
