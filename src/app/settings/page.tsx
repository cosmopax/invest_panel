"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Database, RefreshCw, Bot, Play, Cpu } from "lucide-react";
import { useAgentRuns, useTriggerAgent } from "@/hooks/use-news";

interface ApiKeyStatus {
  key: string;
  label: string;
  configured: boolean;
}

interface SettingsResponse {
  apiKeys: ApiKeyStatus[];
  settings: Record<string, unknown>;
  env: {
    baseCurrency: string;
    timezone: string;
    agentEnabled: boolean;
  };
}

interface ProviderHealth {
  provider: string;
  status: "available" | "unavailable" | "degraded";
  latencyMs?: number;
  error?: string;
  checkedAt: string;
}

interface HealthResponse {
  providers: ProviderHealth[];
  availableCount: number;
  totalCount: number;
}

async function fetchSettings(): Promise<SettingsResponse> {
  const res = await fetch("/api/settings");
  if (!res.ok) throw new Error("Failed to fetch settings");
  return res.json();
}

async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch("/api/ai/health");
  if (!res.ok) throw new Error("Failed to fetch health");
  return res.json();
}

export default function SettingsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: fetchSettings,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">
          AI providers, agent configuration, and data management
        </p>
      </div>

      {/* AI Provider Health */}
      <ProviderHealthCard />

      {/* API Key Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">API Keys</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            API keys are configured in <code className="text-xs">.env.local</code>.
            Status shown below — keys are never exposed through the UI.
          </p>
          <div className="space-y-3">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : (
              data?.apiKeys.map((key) => (
                <div
                  key={key.key}
                  className="flex items-center justify-between rounded-md border border-border px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        key.configured ? "bg-gain" : "bg-loss"
                      }`}
                    />
                    <span className="text-sm font-medium">{key.label}</span>
                  </div>
                  <Badge variant={key.configured ? "default" : "destructive"}>
                    {key.configured ? "Configured" : "Missing"}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Environment */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Environment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-md border border-border px-4 py-3">
              <p className="text-xs text-muted-foreground">Base Currency</p>
              <p className="text-sm font-medium">
                {data?.env.baseCurrency || "EUR"}
              </p>
            </div>
            <div className="rounded-md border border-border px-4 py-3">
              <p className="text-xs text-muted-foreground">Timezone</p>
              <p className="text-sm font-medium">
                {data?.env.timezone || "Europe/Vienna"}
              </p>
            </div>
            <div className="rounded-md border border-border px-4 py-3">
              <p className="text-xs text-muted-foreground">Agents</p>
              <p className="text-sm font-medium">
                {data?.env.agentEnabled ? "Enabled" : "Disabled"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Agent Runs History */}
      <AgentRunsCard />

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Data Management</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Button variant="secondary" size="sm" disabled>
            <Download className="mr-1.5 h-4 w-4" />
            Export Portfolio (CSV)
          </Button>
          <Button variant="secondary" size="sm" disabled>
            <Database className="mr-1.5 h-4 w-4" />
            Backup Database
          </Button>
          <Button variant="secondary" size="sm" disabled>
            <RefreshCw className="mr-1.5 h-4 w-4" />
            Refresh Prices
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

/** Provider Health Card — shows status of Claude, Gemini, Codex CLIs. */
function ProviderHealthCard() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["ai-health"],
    queryFn: fetchHealth,
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  const refreshMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/ai/health", { method: "POST" });
      if (!res.ok) throw new Error("Refresh failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-health"] });
    },
  });

  const providers = data?.providers ?? [];

  const providerMeta: Record<string, { label: string; role: string }> = {
    claude: { label: "Claude Code (Opus 4.6)", role: "Strategist, Forum" },
    gemini: { label: "Gemini CLI (3.1 Pro)", role: "Sentinel, Librarian" },
    codex: { label: "Codex CLI (GPT-5.3)", role: "Scout" },
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Cpu className="h-4 w-4" />
          AI Providers
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refreshMutation.mutate()}
          disabled={refreshMutation.isPending}
        >
          <RefreshCw className={`mr-1 h-3 w-3 ${refreshMutation.isPending ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-muted-foreground">
          Multi-AI orchestration using CLI subscriptions. Agents route to their
          preferred provider with automatic fallback.
        </p>
        <div className="space-y-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Checking providers...</p>
          ) : (
            providers.map((p) => {
              const meta = providerMeta[p.provider] ?? {
                label: p.provider,
                role: "Unknown",
              };
              return (
                <div
                  key={p.provider}
                  className="flex items-center justify-between rounded-md border border-border px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        p.status === "available"
                          ? "bg-emerald-400"
                          : p.status === "degraded"
                            ? "bg-amber-400"
                            : "bg-red-400"
                      }`}
                    />
                    <div>
                      <span className="text-sm font-medium">{meta.label}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {meta.role}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.latencyMs != null && (
                      <span className="text-xs text-muted-foreground">
                        {(p.latencyMs / 1000).toFixed(1)}s
                      </span>
                    )}
                    <Badge
                      variant={
                        p.status === "available" ? "default" : "destructive"
                      }
                    >
                      {p.status}
                    </Badge>
                  </div>
                </div>
              );
            })
          )}
        </div>
        {data && (
          <p className="mt-3 text-xs text-muted-foreground">
            {data.availableCount}/{data.totalCount} providers available
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function AgentRunsCard() {
  const { data, isLoading } = useAgentRuns();
  const triggerAgent = useTriggerAgent();

  const runs = data?.runs ?? [];
  const stats = data?.stats ?? [];
  const schedulerStatus = data?.schedulerStatus ?? {};

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Agent System</CardTitle>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => triggerAgent.mutate("sentinel")}
            disabled={triggerAgent.isPending}
          >
            <Play className="mr-1 h-3 w-3" />
            Run Sentinel
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Scheduler Status */}
        <div className="mb-4 space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Scheduler
          </p>
          {Object.entries(schedulerStatus).map(
            ([agentId, config]: [string, unknown]) => {
              const c = config as {
                enabled: boolean;
                schedule: string;
                description: string;
                active: boolean;
              };
              return (
                <div
                  key={agentId}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <Bot className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-medium capitalize">{agentId}</span>
                    <span className="text-xs text-muted-foreground">
                      {c.description}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="text-[10px] text-muted-foreground">
                      {c.schedule}
                    </code>
                    <Badge
                      variant={c.enabled && c.active ? "default" : "outline"}
                    >
                      {c.active ? "Active" : c.enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                </div>
              );
            },
          )}
        </div>

        {/* Aggregate Stats */}
        {stats.length > 0 && (
          <div className="mb-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Cumulative Stats
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {stats.map(
                (s: {
                  agentId: string;
                  totalRuns: number;
                  successfulRuns: number;
                  failedRuns: number;
                  totalCostUsd: number;
                  avgDurationMs: number;
                }) => (
                  <div
                    key={s.agentId}
                    className="rounded-md border border-border px-3 py-2"
                  >
                    <p className="text-sm font-medium capitalize">
                      {s.agentId}
                    </p>
                    <div className="mt-1 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                      <div>
                        <span className="text-foreground">{s.totalRuns}</span>{" "}
                        runs
                      </div>
                      <div>
                        <span className="text-emerald-400">
                          {s.successfulRuns}
                        </span>{" "}
                        ok
                      </div>
                      <div>
                        ${(s.totalCostUsd ?? 0).toFixed(3)} cost
                      </div>
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>
        )}

        {/* Recent Runs */}
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Recent Runs
        </p>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : runs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No agent runs yet. Ensure CLI tools are installed and run Sentinel.
          </p>
        ) : (
          <div className="space-y-1.5">
            {runs.slice(0, 10).map(
              (run: {
                id: string;
                agentId: string;
                triggerType: string;
                status: string;
                startedAt: string;
                durationMs: number | null;
                tokensInput: number | null;
                tokensOutput: number | null;
                estimatedCostUsd: number | null;
                error: string | null;
                model: string | null;
              }) => (
                <div
                  key={run.id}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        run.status === "completed"
                          ? "bg-emerald-400"
                          : run.status === "failed"
                            ? "bg-red-400"
                            : "bg-amber-400 animate-pulse"
                      }`}
                    />
                    <span className="font-medium capitalize">
                      {run.agentId}
                    </span>
                    <span className="text-muted-foreground">
                      {run.triggerType}
                    </span>
                    {run.model && (
                      <Badge variant="outline" className="h-4 px-1 text-[9px]">
                        {run.model.split(":")[0]}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    {run.durationMs != null && (
                      <span>{(run.durationMs / 1000).toFixed(1)}s</span>
                    )}
                    {run.tokensInput != null && (
                      <span>
                        {run.tokensInput + (run.tokensOutput ?? 0)} tok
                      </span>
                    )}
                    {run.estimatedCostUsd != null && (
                      <span>${run.estimatedCostUsd.toFixed(4)}</span>
                    )}
                    <span>
                      {new Date(run.startedAt).toLocaleTimeString("de-DE", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              ),
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
