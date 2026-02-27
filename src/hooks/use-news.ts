"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUIStore } from "@/stores/ui-store";

export interface NewsItemData {
  id: string;
  externalId: string | null;
  title: string;
  summary: string | null;
  content: string | null;
  url: string;
  source: string;
  sourceQuality: number | null;
  publishedAt: string;
  fetchedAt: string | null;
  category: string | null;
  relatedAssets: string[] | null;
  relevanceScore: number | null;
  sentiment: "bullish" | "bearish" | "neutral" | null;
  sentimentScore: number | null;
  sentimentAssets: Record<string, { sentiment: string; score: number }> | null;
  contentHash: string | null;
  clusterId: string | null;
  decayScore: number | null;
  isRead: boolean;
  isBookmarked: boolean;
  highlighted_title?: string;
}

interface NewsResponse {
  items: NewsItemData[];
  total: number;
}

/** Fetch news items with filters. */
export function useNews(options?: {
  limit?: number;
  offset?: number;
  search?: string;
}) {
  const filters = useUIStore((s) => s.activeWireFilters);
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  return useQuery<NewsResponse>({
    queryKey: ["news", filters, limit, offset, options?.search],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("limit", String(limit));
      params.set("offset", String(offset));

      if (options?.search) {
        params.set("q", options.search);
      } else {
        if (filters.categories.length === 1) {
          params.set("category", filters.categories[0]);
        }
        if (filters.sentiment) {
          params.set("sentiment", filters.sentiment);
        }
        if (filters.minQuality > 1) {
          params.set("minQuality", String(filters.minQuality));
        }
      }

      const res = await fetch(`/api/news?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch news");
      return res.json();
    },
    refetchInterval: 5 * 60 * 1000, // 5 minutes
  });
}

/** Mark a news item as read or bookmarked. */
export function useUpdateNewsItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      isRead?: boolean;
      isBookmarked?: boolean;
    }) => {
      const res = await fetch("/api/news", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update news item");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["news"] });
    },
  });
}

/** Fetch agent run history. */
export function useAgentRuns(agentId?: string) {
  return useQuery({
    queryKey: ["agentRuns", agentId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (agentId) params.set("agentId", agentId);
      const res = await fetch(`/api/agents?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch agent data");
      return res.json();
    },
    refetchInterval: 30 * 1000, // 30 seconds
  });
}

/** Manually trigger an agent. */
export function useTriggerAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (agentId: string) => {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Agent run failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agentRuns"] });
      queryClient.invalidateQueries({ queryKey: ["news"] });
    },
  });
}
