import { getDb, getSqlite } from "@/lib/db";
import { knowledgeEntries } from "@/lib/db/schema";
import { newId } from "@/lib/utils/id";
import { KNOWLEDGE_SEEDS } from "@/lib/data/knowledge-seed";
import { eq, sql, desc } from "drizzle-orm";

/** Seed the knowledge base with initial entries if empty. */
export async function seedKnowledgeIfEmpty(): Promise<number> {
  const db = getDb();
  const existing = await db
    .select({ count: sql<number>`count(*)` })
    .from(knowledgeEntries);

  if (existing[0].count > 0) return 0;

  // Build cross-reference map by slug
  const slugToId = new Map<string, string>();
  const entries: Array<(typeof knowledgeEntries.$inferInsert)> = [];

  for (const seed of KNOWLEDGE_SEEDS) {
    const id = newId();
    slugToId.set(seed.slug, id);
    entries.push({ ...seed, id });
  }

  // Set up cross-references within the same domain
  const domainEntries = new Map<string, string[]>();
  for (const entry of entries) {
    const domain = entry.domain!;
    if (!domainEntries.has(domain)) domainEntries.set(domain, []);
    domainEntries.get(domain)!.push(entry.id);
  }

  // Each entry references others in the same domain (up to 3)
  for (const entry of entries) {
    const siblings = domainEntries
      .get(entry.domain!)!
      .filter((id) => id !== entry.id)
      .slice(0, 3);
    entry.relatedEntries = siblings;
  }

  // Insert all
  for (const entry of entries) {
    await db.insert(knowledgeEntries).values(entry);
  }

  return entries.length;
}

/** Get all knowledge entries grouped by domain. */
export async function getKnowledgeByDomain() {
  const db = getDb();
  const all = await db
    .select()
    .from(knowledgeEntries)
    .orderBy(knowledgeEntries.domain, knowledgeEntries.title);

  const grouped: Record<
    string,
    Array<typeof knowledgeEntries.$inferSelect>
  > = {};
  for (const entry of all) {
    if (!grouped[entry.domain]) grouped[entry.domain] = [];
    grouped[entry.domain].push(entry);
  }
  return grouped;
}

/** Get a single knowledge entry by slug. */
export async function getKnowledgeBySlug(slug: string) {
  const db = getDb();
  const results = await db
    .select()
    .from(knowledgeEntries)
    .where(eq(knowledgeEntries.slug, slug))
    .limit(1);
  return results[0] || null;
}

/** Get related entries by IDs. */
export async function getRelatedEntries(ids: string[]) {
  if (!ids || ids.length === 0) return [];
  const db = getDb();
  const results = [];
  for (const id of ids.slice(0, 5)) {
    const entry = await db
      .select({
        id: knowledgeEntries.id,
        title: knowledgeEntries.title,
        slug: knowledgeEntries.slug,
        domain: knowledgeEntries.domain,
        summary: knowledgeEntries.summary,
      })
      .from(knowledgeEntries)
      .where(eq(knowledgeEntries.id, id))
      .limit(1);
    if (entry[0]) results.push(entry[0]);
  }
  return results;
}

/** Search knowledge using FTS5. */
export function searchKnowledge(query: string, limit = 20) {
  const sqlite = getSqlite();
  return sqlite
    .prepare(
      `SELECT k.*,
              highlight(knowledge_fts, 0, '<mark>', '</mark>') as highlighted_title,
              knowledge_fts.rank
       FROM knowledge_fts
       JOIN knowledge_entries k ON k.rowid = knowledge_fts.rowid
       WHERE knowledge_fts MATCH ?
       ORDER BY knowledge_fts.rank
       LIMIT ?`,
    )
    .all(query, limit);
}

/** Get domain taxonomy with counts. */
export async function getDomainTaxonomy() {
  const db = getDb();
  const rows = await db
    .select({
      domain: knowledgeEntries.domain,
      subdomain: knowledgeEntries.subdomain,
      count: sql<number>`count(*)`,
    })
    .from(knowledgeEntries)
    .groupBy(knowledgeEntries.domain, knowledgeEntries.subdomain);

  const taxonomy: Record<
    string,
    { total: number; subdomains: Record<string, number> }
  > = {};

  for (const row of rows) {
    if (!taxonomy[row.domain]) {
      taxonomy[row.domain] = { total: 0, subdomains: {} };
    }
    taxonomy[row.domain].total += row.count;
    if (row.subdomain) {
      taxonomy[row.domain].subdomains[row.subdomain] = row.count;
    }
  }

  return taxonomy;
}
