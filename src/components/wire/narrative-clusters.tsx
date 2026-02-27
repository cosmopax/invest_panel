"use client";

import type { NewsItemData } from "@/hooks/use-news";

interface NarrativeClustersProps {
  items: NewsItemData[];
}

interface Narrative {
  tag: string;
  count: number;
  latestSentiment: string | null;
}

/** Extract narrative clusters from news items. */
function extractNarratives(items: NewsItemData[]): Narrative[] {
  const narrativeMap = new Map<string, Narrative>();

  for (const item of items) {
    // Use category as a fallback narrative grouping
    const tag = (item as unknown as Record<string, string>).narrativeTag || item.category;
    if (!tag) continue;

    const existing = narrativeMap.get(tag);
    if (existing) {
      existing.count++;
      existing.latestSentiment = item.sentiment;
    } else {
      narrativeMap.set(tag, {
        tag,
        count: 1,
        latestSentiment: item.sentiment,
      });
    }
  }

  return [...narrativeMap.values()]
    .filter((n) => n.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

const SENTIMENT_DOT: Record<string, string> = {
  bullish: "bg-emerald-400",
  bearish: "bg-red-400",
  neutral: "bg-slate-400",
};

export function NarrativeClusters({ items }: NarrativeClustersProps) {
  const narratives = extractNarratives(items);

  if (narratives.length === 0) {
    return (
      <div className="py-4 text-center text-xs text-muted-foreground">
        Not enough data for narrative detection
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {narratives.map((n) => (
        <div
          key={n.tag}
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-accent/50"
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${SENTIMENT_DOT[n.latestSentiment || ""] || "bg-slate-500"}`}
          />
          <span className="flex-1 truncate capitalize text-foreground">
            {n.tag.replace(/_/g, " ")}
          </span>
          <span className="text-muted-foreground">{n.count}</span>
        </div>
      ))}
    </div>
  );
}
