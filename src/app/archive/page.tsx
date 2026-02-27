"use client";

import { useState, useEffect } from "react";
import { useKnowledge, useKnowledgeSearch, useSeedKnowledge } from "@/hooks/use-knowledge";
import { DomainSidebar } from "@/components/archive/domain-sidebar";
import { KnowledgeCard } from "@/components/archive/knowledge-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, BookOpen, Database } from "lucide-react";
import type { KnowledgeEntry } from "@/lib/db/schema";

export default function ArchivePage() {
  const [activeDomain, setActiveDomain] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const { data, isLoading, refetch } = useKnowledge();
  const searchResults = useKnowledgeSearch(debouncedQuery);
  const seedMutation = useSeedKnowledge();

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSeed = async () => {
    await seedMutation.mutateAsync();
    refetch();
  };

  const entries = data?.entries ?? {};
  const taxonomy = data?.taxonomy ?? {};

  // Filter entries by active domain
  const filteredEntries: KnowledgeEntry[] = debouncedQuery
    ? ((searchResults.data?.results as KnowledgeEntry[]) ?? [])
    : activeDomain
      ? entries[activeDomain] ?? []
      : Object.values(entries).flat();

  const totalEntries = Object.values(entries).reduce(
    (sum, arr) => sum + arr.length,
    0,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            The Archive
          </h1>
          <p className="text-sm text-muted-foreground">
            Searchable knowledge library of financial concepts, models, and
            frameworks
          </p>
        </div>
        {totalEntries === 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleSeed}
            disabled={seedMutation.isPending}
          >
            <Database className="mr-1.5 h-3.5 w-3.5" />
            {seedMutation.isPending ? "Seeding..." : "Seed Library"}
          </Button>
        )}
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_1fr]">
        {/* Sidebar */}
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search concepts..."
              className="h-9 pl-8 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Domain taxonomy */}
          <div className="rounded-lg border border-border bg-card p-3">
            <Label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Domains
            </Label>
            {Object.keys(taxonomy).length > 0 ? (
              <DomainSidebar
                taxonomy={taxonomy}
                activeDomain={activeDomain}
                onDomainSelect={setActiveDomain}
              />
            ) : (
              <p className="py-4 text-center text-xs text-muted-foreground">
                No entries yet
              </p>
            )}
          </div>
        </div>

        {/* Content */}
        <div>
          {isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-border bg-card p-4"
                >
                  <Skeleton className="mb-2 h-4 w-3/4" />
                  <Skeleton className="mb-1 h-3 w-full" />
                  <Skeleton className="mb-3 h-3 w-2/3" />
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed border-border text-center">
              <BookOpen className="mb-3 h-8 w-8 text-muted-foreground/50" />
              {totalEntries === 0 ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    The Archive is empty
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground/70">
                    Click &ldquo;Seed Library&rdquo; to populate with 30
                    foundational entries
                  </p>
                </>
              ) : debouncedQuery ? (
                <p className="text-sm text-muted-foreground">
                  No results for &ldquo;{debouncedQuery}&rdquo;
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No entries in this domain
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="mb-3 text-xs text-muted-foreground">
                {filteredEntries.length} entr
                {filteredEntries.length !== 1 ? "ies" : "y"}
                {debouncedQuery && ` matching "${debouncedQuery}"`}
                {activeDomain && !debouncedQuery && ` in ${activeDomain.replace(/_/g, " ")}`}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {filteredEntries.map((entry) => (
                  <KnowledgeCard key={entry.id || entry.slug} entry={entry} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
