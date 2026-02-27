"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HoldingsTable } from "@/components/portfolio/holdings-table";
import { AllocationChart } from "@/components/portfolio/allocation-chart";
import { AddHoldingDialog } from "@/components/portfolio/add-holding-dialog";
import { usePortfolio } from "@/hooks/use-portfolio";
import { TrendingUp, Wallet, PieChart } from "lucide-react";

function formatEur(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

export default function DashboardPage() {
  const { holdings, totalValue, totalCost, isLoading } = usePortfolio();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Portfolio overview and performance
          </p>
        </div>
        <AddHoldingDialog />
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Value
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">
              {isLoading ? "..." : formatEur(totalValue)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Cost Basis
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">
              {isLoading ? "..." : formatEur(totalCost)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Holdings
            </CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{holdings.length}</p>
            <p className="text-xs text-muted-foreground">
              across {new Set(holdings.map((h) => h.asset.assetClass)).size}{" "}
              asset classes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main content: table + chart */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Holdings</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <HoldingsTable holdings={holdings} totalValue={totalValue} />
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Asset Allocation</CardTitle>
            </CardHeader>
            <CardContent>
              <AllocationChart holdings={holdings} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
