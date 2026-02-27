import { NextRequest, NextResponse } from "next/server";
import {
  getKnowledgeByDomain,
  getKnowledgeBySlug,
  getRelatedEntries,
  searchKnowledge,
  seedKnowledgeIfEmpty,
  getDomainTaxonomy,
} from "@/lib/services/knowledge-service";

/** GET /api/knowledge — List entries, get by slug, or search. */
export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const slug = params.get("slug");
    const search = params.get("q");
    const action = params.get("action");

    // Seed on first access
    if (action === "seed") {
      const count = await seedKnowledgeIfEmpty();
      return NextResponse.json({ seeded: count });
    }

    // Taxonomy
    if (action === "taxonomy") {
      const taxonomy = await getDomainTaxonomy();
      return NextResponse.json({ taxonomy });
    }

    // Single entry by slug
    if (slug) {
      const entry = await getKnowledgeBySlug(slug);
      if (!entry) {
        return NextResponse.json(
          { error: "Entry not found" },
          { status: 404 },
        );
      }
      const related = await getRelatedEntries(
        (entry.relatedEntries as string[]) || [],
      );
      return NextResponse.json({ entry, related });
    }

    // FTS5 search
    if (search) {
      const results = searchKnowledge(search);
      return NextResponse.json({ results });
    }

    // All entries grouped by domain
    const grouped = await getKnowledgeByDomain();
    const taxonomy = await getDomainTaxonomy();
    return NextResponse.json({ entries: grouped, taxonomy });
  } catch (error) {
    console.error("[API] GET /api/knowledge error:", error);
    return NextResponse.json(
      { error: "Failed to fetch knowledge" },
      { status: 500 },
    );
  }
}
