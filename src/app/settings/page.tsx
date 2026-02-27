"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Database, RefreshCw } from "lucide-react";

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

async function fetchSettings(): Promise<SettingsResponse> {
  const res = await fetch("/api/settings");
  if (!res.ok) throw new Error("Failed to fetch settings");
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
          API keys, agent configuration, and data management
        </p>
      </div>

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
