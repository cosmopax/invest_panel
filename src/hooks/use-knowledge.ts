"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { KnowledgeEntry } from "@/lib/db/schema";

interface KnowledgeResponse {
  entries: Record<string, KnowledgeEntry[]>;
  taxonomy: Record<
    string,
    { total: number; subdomains: Record<string, number> }
  >;
}

interface EntryResponse {
  entry: KnowledgeEntry;
  related: Array<{
    id: string;
    title: string;
    slug: string;
    domain: string;
    summary: string;
  }>;
}

/** Fetch all knowledge entries grouped by domain. */
export function useKnowledge() {
  return useQuery<KnowledgeResponse>({
    queryKey: ["knowledge"],
    queryFn: async () => {
      const res = await fetch("/api/knowledge");
      if (!res.ok) throw new Error("Failed to fetch knowledge");
      return res.json();
    },
  });
}

/** Fetch a single knowledge entry by slug. */
export function useKnowledgeEntry(slug: string) {
  return useQuery<EntryResponse>({
    queryKey: ["knowledge", slug],
    queryFn: async () => {
      const res = await fetch(`/api/knowledge?slug=${encodeURIComponent(slug)}`);
      if (!res.ok) throw new Error("Entry not found");
      return res.json();
    },
    enabled: !!slug,
  });
}

/** Search knowledge entries. */
export function useKnowledgeSearch(query: string) {
  return useQuery({
    queryKey: ["knowledgeSearch", query],
    queryFn: async () => {
      const res = await fetch(
        `/api/knowledge?q=${encodeURIComponent(query)}`,
      );
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
    enabled: query.length >= 2,
  });
}

/** Seed the knowledge base. */
export function useSeedKnowledge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/knowledge?action=seed");
      if (!res.ok) throw new Error("Seed failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge"] });
    },
  });
}
