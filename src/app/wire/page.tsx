"use client";

import { useState } from "react";
import { useNews } from "@/hooks/use-news";
import { NewsCard } from "@/components/wire/news-card";
import { WireFilters } from "@/components/wire/wire-filters";
import { NarrativeClusters } from "@/components/wire/narrative-clusters";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RefreshCw, Rss } from "lucide-react";
import { useTriggerAgent } from "@/hooks/use-news";

export default function WirePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const { data, isLoading, refetch, isFetching } = useNews({ search: searchQuery || undefined });
  const triggerAgent = useTriggerAgent();

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  const handleRunSentinel = () => {
    triggerAgent.mutate("sentinel");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">The Wire</h1>
          <p className="text-sm text-muted-foreground">
            AI-curated financial newsfeed with sentiment analysis
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw
              className={`mr-1.5 h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRunSentinel}
            disabled={triggerAgent.isPending}
          >
            <Rss className="mr-1.5 h-3.5 w-3.5" />
            {triggerAgent.isPending ? "Running..." : "Run Sentinel"}
          </Button>
        </div>
      </div>

      {/* Main layout: feed + sidebar */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
        {/* Feed */}
        <div className="space-y-3">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-border bg-card p-4">
                <Skeleton className="mb-2 h-3 w-24" />
                <Skeleton className="mb-2 h-4 w-full" />
                <Skeleton className="mb-3 h-3 w-3/4" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-14" />
                </div>
              </div>
            ))
          ) : items.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed border-border text-center">
              <Rss className="mb-3 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No news items yet
              </p>
              <p className="mt-1 text-xs text-muted-foreground/70">
                Configure your Finnhub API key and run Sentinel to start
                fetching news
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={handleRunSentinel}
                disabled={triggerAgent.isPending}
              >
                <Rss className="mr-1.5 h-3.5 w-3.5" />
                Run Sentinel Now
              </Button>
            </div>
          ) : (
            <>
              <div className="text-xs text-muted-foreground">
                {total} article{total !== 1 ? "s" : ""}
                {searchQuery && (
                  <span>
                    {" "}
                    matching &ldquo;{searchQuery}&rdquo;
                  </span>
                )}
              </div>
              {items.map((item) => (
                <NewsCard key={item.id} item={item} />
              ))}
            </>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-4">
            <Label className="mb-3 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Filters
            </Label>
            <WireFilters
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <Label className="mb-3 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Emerging Narratives
            </Label>
            <NarrativeClusters items={items} />
          </div>
        </div>
      </div>
    </div>
  );
}
