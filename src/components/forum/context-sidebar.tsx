"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Briefcase, Newspaper, Lightbulb } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

/** Fetch context data for the sidebar. */
function useForumContext() {
  return useQuery({
    queryKey: ["forumContext"],
    queryFn: async () => {
      const [portfolioRes, newsRes, recsRes] = await Promise.all([
        fetch("/api/portfolio").then((r) => r.json()),
        fetch("/api/news?limit=5").then((r) => r.json()),
        fetch("/api/recommendations?limit=5").then((r) => r.json()),
      ]);
      return {
        holdings: portfolioRes.holdings || [],
        news: newsRes.items || [],
        recommendations: recsRes.items || [],
      };
    },
    refetchInterval: 5 * 60 * 1000,
  });
}

export function ContextSidebar() {
  const { data } = useForumContext();

  return (
    <ScrollArea className="h-full border-l border-border/50">
      <div className="space-y-4 p-3">
        <h3 className="text-xs font-semibold uppercase text-muted-foreground">
          Context
        </h3>

        {/* Portfolio */}
        <Card className="border-border/30 bg-zinc-900/50">
          <CardHeader className="px-3 py-2">
            <CardTitle className="flex items-center gap-1.5 text-xs">
              <Briefcase className="h-3.5 w-3.5" />
              Portfolio
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 pt-0">
            {data?.holdings && data.holdings.length > 0 ? (
              <div className="space-y-1">
                {data.holdings.slice(0, 8).map((h: { id: string; asset?: { symbol: string; assetClass: string }; quantity: number }) => (
                  <div
                    key={h.id}
                    className="flex items-center justify-between text-[10px]"
                  >
                    <span className="font-mono text-foreground">
                      {h.asset?.symbol || "?"}
                    </span>
                    <Badge
                      variant="outline"
                      className="h-4 px-1 text-[9px] border-zinc-700"
                    >
                      {h.asset?.assetClass}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-muted-foreground">
                No holdings
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent News */}
        <Card className="border-border/30 bg-zinc-900/50">
          <CardHeader className="px-3 py-2">
            <CardTitle className="flex items-center gap-1.5 text-xs">
              <Newspaper className="h-3.5 w-3.5" />
              Recent Wire
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 pt-0">
            {data?.news && data.news.length > 0 ? (
              <div className="space-y-1.5">
                {data.news.map((n: { id: string; title: string; sentiment: string | null }) => (
                  <div key={n.id} className="text-[10px] leading-tight">
                    <span className="text-foreground line-clamp-2">
                      {n.title}
                    </span>
                    {n.sentiment && (
                      <span
                        className={`ml-1 ${
                          n.sentiment === "bullish"
                            ? "text-emerald-400"
                            : n.sentiment === "bearish"
                              ? "text-red-400"
                              : "text-zinc-400"
                        }`}
                      >
                        ({n.sentiment})
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-muted-foreground">
                No recent news
              </p>
            )}
          </CardContent>
        </Card>

        {/* Active Recommendations */}
        <Card className="border-border/30 bg-zinc-900/50">
          <CardHeader className="px-3 py-2">
            <CardTitle className="flex items-center gap-1.5 text-xs">
              <Lightbulb className="h-3.5 w-3.5" />
              Active Recs
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 pt-0">
            {data?.recommendations && data.recommendations.length > 0 ? (
              <div className="space-y-1.5">
                {data.recommendations.map((r: { id: string; title: string; confidence: number; type: string }) => (
                  <div key={r.id} className="text-[10px]">
                    <div className="flex items-center gap-1">
                      <Badge
                        variant="outline"
                        className="h-3.5 px-1 text-[8px] border-zinc-700"
                      >
                        {r.type}
                      </Badge>
                      <span className="font-mono text-muted-foreground">
                        {(r.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                    <span className="text-foreground line-clamp-1">
                      {r.title}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-muted-foreground">
                No active recommendations
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
