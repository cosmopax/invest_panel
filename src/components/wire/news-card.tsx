"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bookmark, BookmarkCheck, ExternalLink } from "lucide-react";
import type { NewsItemData } from "@/hooks/use-news";
import { useUpdateNewsItem } from "@/hooks/use-news";

const CATEGORY_COLORS: Record<string, string> = {
  geopolitics: "bg-red-900/50 text-red-300",
  macro: "bg-blue-900/50 text-blue-300",
  central_bank: "bg-purple-900/50 text-purple-300",
  tech: "bg-cyan-900/50 text-cyan-300",
  energy: "bg-amber-900/50 text-amber-300",
  regulatory: "bg-orange-900/50 text-orange-300",
  earnings: "bg-emerald-900/50 text-emerald-300",
  market_structure: "bg-slate-700/50 text-slate-300",
};

const SENTIMENT_STYLES: Record<string, string> = {
  bullish: "bg-emerald-900/50 text-emerald-300 border-emerald-700",
  bearish: "bg-red-900/50 text-red-300 border-red-700",
  neutral: "bg-slate-700/50 text-slate-400 border-slate-600",
};

const QUALITY_COLORS: Record<number, string> = {
  10: "text-yellow-400",
  9: "text-yellow-400",
  8: "text-blue-400",
  7: "text-blue-300",
  6: "text-slate-400",
};

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("de-DE", {
    month: "short",
    day: "numeric",
  });
}

interface NewsCardProps {
  item: NewsItemData;
}

export function NewsCard({ item }: NewsCardProps) {
  const updateNews = useUpdateNewsItem();

  const handleBookmark = () => {
    updateNews.mutate({
      id: item.id,
      isBookmarked: !item.isBookmarked,
    });
  };

  const handleClick = () => {
    if (!item.isRead) {
      updateNews.mutate({ id: item.id, isRead: true });
    }
  };

  const qualityLevel = item.sourceQuality ?? 5;

  return (
    <div
      className={`group rounded-lg border p-4 transition-colors hover:border-border/80 ${
        item.isRead
          ? "border-border/30 bg-card/50"
          : "border-border bg-card"
      }`}
    >
      {/* Header: source + time + quality */}
      <div className="mb-2 flex items-center gap-2 text-xs">
        <span
          className={`font-medium ${QUALITY_COLORS[qualityLevel] || "text-slate-500"}`}
        >
          {item.source}
        </span>
        {item.relevanceScore != null && item.relevanceScore >= 0.7 && (
          <span className="rounded bg-blue-900/40 px-1.5 py-0.5 text-[10px] text-blue-300">
            HIGH RELEVANCE
          </span>
        )}
        <span className="ml-auto text-muted-foreground">
          {formatRelativeTime(item.publishedAt)}
        </span>
      </div>

      {/* Title */}
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group/link mb-2 block"
        onClick={handleClick}
      >
        <h3
          className={`text-sm font-medium leading-snug transition-colors group-hover/link:text-blue-400 ${
            item.isRead ? "text-muted-foreground" : "text-foreground"
          }`}
          dangerouslySetInnerHTML={{
            __html: item.highlighted_title || item.title,
          }}
        />
      </a>

      {/* Summary */}
      {item.summary && (
        <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {item.summary}
        </p>
      )}

      {/* Footer: badges + actions */}
      <div className="flex items-center gap-1.5">
        {item.category && (
          <Badge
            variant="outline"
            className={`text-[10px] ${CATEGORY_COLORS[item.category] || "bg-slate-700/50 text-slate-400"}`}
          >
            {item.category.replace("_", " ")}
          </Badge>
        )}
        {item.sentiment && (
          <Badge
            variant="outline"
            className={`text-[10px] ${SENTIMENT_STYLES[item.sentiment] || ""}`}
          >
            {item.sentiment}
            {item.sentimentScore != null && (
              <span className="ml-1 opacity-70">
                {item.sentimentScore > 0 ? "+" : ""}
                {item.sentimentScore.toFixed(1)}
              </span>
            )}
          </Badge>
        )}

        {/* Relevance bar */}
        {item.relevanceScore != null && (
          <div className="ml-1 flex items-center gap-1" title={`Relevance: ${(item.relevanceScore * 100).toFixed(0)}%`}>
            <div className="h-1 w-8 overflow-hidden rounded-full bg-slate-700">
              <div
                className="h-full rounded-full bg-blue-500"
                style={{ width: `${item.relevanceScore * 100}%` }}
              />
            </div>
          </div>
        )}

        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={handleBookmark}
          >
            {item.isBookmarked ? (
              <BookmarkCheck className="h-3.5 w-3.5 text-blue-400" />
            ) : (
              <Bookmark className="h-3.5 w-3.5" />
            )}
          </Button>
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-6 w-6 items-center justify-center rounded-md opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100"
          >
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
          </a>
        </div>
      </div>
    </div>
  );
}
