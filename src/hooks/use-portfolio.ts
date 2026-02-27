"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface AssetData {
  id: string;
  symbol: string;
  name: string;
  assetClass: string;
  exchange: string | null;
  currency: string;
  metadata: unknown;
}

export interface HoldingData {
  id: string;
  assetId: string;
  quantity: number;
  costBasisPerUnit: number;
  costBasisEur: number;
  purchaseDate: string;
  notes: string | null;
  isClosed: boolean;
  asset: AssetData;
}

export interface PortfolioSummary {
  holdings: HoldingData[];
  totalValue: number;
  totalCost: number;
  totalChange: number;
  totalChangePercent: number;
  isLoading: boolean;
  error: Error | null;
}

/** Fetch portfolio holdings from API. */
async function fetchPortfolio(): Promise<HoldingData[]> {
  const res = await fetch("/api/portfolio");
  if (!res.ok) throw new Error("Failed to fetch portfolio");
  return res.json();
}

/** Hook: portfolio holdings with computed totals. */
export function usePortfolio(): PortfolioSummary {
  const { data, isLoading, error } = useQuery<HoldingData[]>({
    queryKey: ["portfolio"],
    queryFn: fetchPortfolio,
    refetchInterval: 60_000,
  });

  const holdings = data || [];

  // Compute totals from cost basis (prices will be fetched separately)
  const totalCost = holdings.reduce(
    (sum, h) => sum + h.costBasisEur * h.quantity,
    0,
  );

  return {
    holdings,
    totalValue: totalCost, // Will be replaced with live prices
    totalCost,
    totalChange: 0, // Needs live prices
    totalChangePercent: 0,
    isLoading,
    error: error as Error | null,
  };
}

/** Hook: add a new holding. */
export function useAddHolding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      symbol: string;
      name: string;
      assetClass: "stock" | "crypto" | "metal";
      exchange?: string;
      currency?: string;
      quantity: number;
      costBasisPerUnit: number;
      costBasisEur: number;
      purchaseDate: string;
      notes?: string;
      metadata?: Record<string, unknown>;
    }) => {
      const res = await fetch("/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to add holding");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
    },
  });
}

/** Hook: close (soft-delete) a holding. */
export function useCloseHolding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      closedPricePerUnit: number;
      closedPriceEur: number;
    }) => {
      const res = await fetch("/api/portfolio", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to close holding");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
    },
  });
}
