"use client";

import { TrendingUp, TrendingDown, Minus, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/ui-store";
import { Button } from "@/components/ui/button";
import { usePortfolio } from "@/hooks/use-portfolio";

function formatEur(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function TopBar() {
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const { totalValue, totalChange, totalChangePercent, isLoading } =
    usePortfolio();

  const changeType =
    totalChange > 0 ? "gain" : totalChange < 0 ? "loss" : "neutral";

  return (
    <header className="flex h-14 items-center gap-4 border-b border-border/40 bg-card px-4">
      {/* Mobile menu toggle */}
      <Button
        variant="ghost"
        size="sm"
        className="lg:hidden"
        onClick={toggleSidebar}
      >
        <Menu className="h-4 w-4" />
      </Button>

      {/* Portfolio value */}
      <div className="flex items-center gap-6">
        <div>
          <p className="text-xs text-muted-foreground">Portfolio Value</p>
          <p className="text-lg font-semibold tabular-nums text-foreground">
            {isLoading ? "..." : formatEur(totalValue)}
          </p>
        </div>

        {!isLoading && totalChange !== 0 && (
          <div className="flex items-center gap-1.5">
            {changeType === "gain" ? (
              <TrendingUp className="h-4 w-4 text-gain" />
            ) : changeType === "loss" ? (
              <TrendingDown className="h-4 w-4 text-loss" />
            ) : (
              <Minus className="h-4 w-4 text-neutral" />
            )}
            <span
              className={cn(
                "text-sm font-medium tabular-nums",
                changeType === "gain" && "text-gain",
                changeType === "loss" && "text-loss",
              )}
            >
              {totalChange > 0 ? "+" : ""}
              {formatEur(totalChange)} ({totalChangePercent > 0 ? "+" : ""}
              {totalChangePercent.toFixed(2)}%)
            </span>
          </div>
        )}
      </div>

      {/* Market status indicators (placeholder for now) */}
      <div className="ml-auto flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-neutral" />
          <span className="text-xs text-muted-foreground">NYSE</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-gain" />
          <span className="text-xs text-muted-foreground">Crypto</span>
        </div>
      </div>
    </header>
  );
}
