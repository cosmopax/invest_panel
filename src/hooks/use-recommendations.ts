"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface RecommendationData {
  id: string;
  agentId: string;
  type: string;
  title: string;
  thesis: string;
  evidence: Array<{ type: string; detail: string }> | null;
  riskAssessment: string;
  confidence: number;
  timeHorizon: string;
  relatedAssets: Array<{ assetId: string; action: string }> | null;
  status: string;
  outcomeNotes: string | null;
  accuracyScore: number | null;
  createdAt: string;
  expiresAt: string | null;
  reviewedAt: string | null;
}

interface RecommendationsResponse {
  items: RecommendationData[];
  total: number;
  accuracyStats: Array<{
    agentId: string;
    avgAccuracy: number | null;
    totalScored: number;
    totalActive: number;
  }>;
}

export interface RecommendationFilters {
  type?: string;
  status?: string;
  agentId?: string;
  minConf?: number;
  maxConf?: number;
  horizon?: string;
  showHistory?: boolean;
}

/** Fetch recommendations with filters. */
export function useRecommendations(filters?: RecommendationFilters) {
  return useQuery<RecommendationsResponse>({
    queryKey: ["recommendations", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.type) params.set("type", filters.type);
      if (filters?.status) params.set("status", filters.status);
      if (filters?.agentId) params.set("agentId", filters.agentId);
      if (filters?.minConf !== undefined)
        params.set("minConf", String(filters.minConf));
      if (filters?.maxConf !== undefined)
        params.set("maxConf", String(filters.maxConf));
      if (filters?.horizon) params.set("horizon", filters.horizon);
      if (filters?.showHistory) params.set("history", "true");

      const res = await fetch(`/api/recommendations?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch recommendations");
      return res.json();
    },
    refetchInterval: 2 * 60 * 1000, // 2 minutes
  });
}

/** Update a recommendation (status, outcome, accuracy). */
export function useUpdateRecommendation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      status?: string;
      outcomeNotes?: string;
      accuracyScore?: number;
    }) => {
      const res = await fetch("/api/recommendations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update recommendation");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recommendations"] });
    },
  });
}
