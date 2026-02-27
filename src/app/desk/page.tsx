"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RefreshCw,
  Crosshair,
  Brain,
  TrendingUp,
  AlertTriangle,
  Scale,
  Globe,
  BarChart3,
} from "lucide-react";
import { RecommendationCard } from "@/components/desk/recommendation-card";
import { DeskFilters } from "@/components/desk/desk-filters";
import {
  useRecommendations,
  useUpdateRecommendation,
  type RecommendationFilters,
} from "@/hooks/use-recommendations";
import { useTriggerAgent } from "@/hooks/use-news";

const CATEGORY_TABS = [
  { value: "all", label: "All", icon: BarChart3 },
  { value: "opportunity", label: "Opportunities", icon: TrendingUp },
  { value: "risk_warning", label: "Risk Warnings", icon: AlertTriangle },
  { value: "rebalance", label: "Rebalancing", icon: Scale },
  { value: "macro_thesis", label: "Macro Thesis", icon: Globe },
] as const;

export default function DeskPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [filters, setFilters] = useState<RecommendationFilters>({});

  // Merge tab into filters
  const effectiveFilters: RecommendationFilters = {
    ...filters,
    type: activeTab === "all" ? undefined : activeTab,
  };

  const {
    data,
    isLoading,
    refetch,
    isFetching,
  } = useRecommendations(effectiveFilters);
  const updateRec = useUpdateRecommendation();
  const triggerAgent = useTriggerAgent();

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const accuracyStats = data?.accuracyStats ?? [];

  const scoutStats = accuracyStats.find((s) => s.agentId === "scout");
  const strategistStats = accuracyStats.find(
    (s) => s.agentId === "strategist",
  );

  const handleMarkReviewed = (id: string) => {
    updateRec.mutate({
      id,
      status: "active",
      // Just set the reviewedAt
    });
    // Patch directly with reviewedAt
    fetch("/api/recommendations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, reviewedAt: new Date().toISOString() }),
    });
  };

  const handleDismiss = (id: string) => {
    updateRec.mutate({ id, status: "invalidated" });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">The Desk</h1>
          <p className="text-sm text-muted-foreground">
            Investment recommendations from Scout and Strategist agents
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => triggerAgent.mutate("scout")}
            disabled={triggerAgent.isPending}
          >
            <Crosshair className="mr-1.5 h-3.5 w-3.5" />
            Run Scout
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => triggerAgent.mutate("strategist")}
            disabled={triggerAgent.isPending}
          >
            <Brain className="mr-1.5 h-3.5 w-3.5" />
            Run Strategist
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw
              className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="border-border/50 bg-card/80">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">
              Active Recommendations
            </div>
            <div className="text-2xl font-semibold text-foreground">
              {total}
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/80">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">
              Scout Active
            </div>
            <div className="text-2xl font-semibold text-foreground">
              {scoutStats?.totalActive ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/80">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">
              Strategist Active
            </div>
            <div className="text-2xl font-semibold text-foreground">
              {strategistStats?.totalActive ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/80">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">
              Avg Accuracy
            </div>
            <div className="text-2xl font-semibold text-foreground">
              {accuracyStats.some((s) => s.avgAccuracy !== null)
                ? `${(
                    ((accuracyStats.reduce(
                      (sum, s) => sum + (s.avgAccuracy ?? 0),
                      0,
                    ) /
                      accuracyStats.filter((s) => s.avgAccuracy !== null)
                        .length) *
                      100)
                  ).toFixed(0)}%`
                : "—"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList className="bg-zinc-900/50">
            {CATEGORY_TABS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="gap-1.5 text-xs data-[state=active]:bg-zinc-800"
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>

      {/* Filters */}
      <DeskFilters filters={filters} onChange={setFilters} />

      {/* Recommendation cards */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="border-border/50 bg-card/80">
              <CardHeader className="pb-3">
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-14" />
                </div>
                <Skeleton className="mt-2 h-4 w-3/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card className="border-dashed border-border/50 bg-card/50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BarChart3 className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <h3 className="text-sm font-medium text-muted-foreground">
              No recommendations yet
            </h3>
            <p className="mt-1 text-xs text-muted-foreground/70">
              Run Scout or Strategist to generate investment insights
            </p>
            <div className="mt-4 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => triggerAgent.mutate("scout")}
                disabled={triggerAgent.isPending}
              >
                <Crosshair className="mr-1.5 h-3.5 w-3.5" />
                Run Scout
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => triggerAgent.mutate("strategist")}
                disabled={triggerAgent.isPending}
              >
                <Brain className="mr-1.5 h-3.5 w-3.5" />
                Run Strategist
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((rec) => (
            <RecommendationCard
              key={rec.id}
              recommendation={rec}
              onMarkReviewed={handleMarkReviewed}
              onDismiss={handleDismiss}
            />
          ))}
        </div>
      )}
    </div>
  );
}
