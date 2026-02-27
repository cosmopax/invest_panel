"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Eye,
  ExternalLink,
} from "lucide-react";
import type { RecommendationData } from "@/hooks/use-recommendations";

interface RecommendationCardProps {
  recommendation: RecommendationData;
  onMarkReviewed?: (id: string) => void;
  onDismiss?: (id: string) => void;
}

/** Map recommendation type to display label and color. */
const TYPE_CONFIG: Record<string, { label: string; className: string }> = {
  opportunity: {
    label: "Opportunity",
    className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  },
  risk_warning: {
    label: "Risk Warning",
    className: "bg-red-500/20 text-red-400 border-red-500/30",
  },
  rebalance: {
    label: "Rebalance",
    className: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  },
  macro_thesis: {
    label: "Macro Thesis",
    className: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  },
};

/** Map status to display. */
const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-emerald-500/20 text-emerald-400" },
  expired: { label: "Expired", className: "bg-zinc-500/20 text-zinc-400" },
  validated: {
    label: "Validated",
    className: "bg-blue-500/20 text-blue-400",
  },
  invalidated: {
    label: "Invalidated",
    className: "bg-red-500/20 text-red-400",
  },
};

/** Map action to badge variant. */
const ACTION_CONFIG: Record<string, { className: string }> = {
  buy: { className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  sell: { className: "bg-red-500/20 text-red-400 border-red-500/30" },
  hold: { className: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30" },
  watch: { className: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
};

/** Get confidence color based on value. */
function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.7) return "bg-emerald-500";
  if (confidence >= 0.5) return "bg-amber-500";
  return "bg-red-500";
}

/** Format relative time. */
function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function RecommendationCard({
  recommendation: rec,
  onMarkReviewed,
  onDismiss,
}: RecommendationCardProps) {
  const [expanded, setExpanded] = useState(false);

  const typeConfig = TYPE_CONFIG[rec.type] || TYPE_CONFIG.opportunity;
  const statusConfig = STATUS_CONFIG[rec.status] || STATUS_CONFIG.active;

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm transition-colors hover:border-border">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {/* Type + Agent + Status badges */}
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={typeConfig.className}>
                {typeConfig.label}
              </Badge>
              <Badge
                variant="outline"
                className="border-zinc-600 bg-zinc-800/50 text-zinc-300"
              >
                {rec.agentId === "scout" ? "Scout" : "Strategist"}
              </Badge>
              <Badge variant="outline" className={statusConfig.className}>
                {statusConfig.label}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {relativeTime(rec.createdAt)}
              </span>
            </div>

            {/* Title */}
            <h3 className="text-sm font-semibold text-foreground leading-tight">
              {rec.title}
            </h3>
          </div>

          {/* Confidence meter */}
          <div className="flex flex-col items-end gap-1">
            <span className="text-xs text-muted-foreground">Confidence</span>
            <div className="flex items-center gap-2">
              <div className="h-2 w-16 rounded-full bg-zinc-800">
                <div
                  className={`h-full rounded-full ${getConfidenceColor(rec.confidence)}`}
                  style={{ width: `${rec.confidence * 100}%` }}
                />
              </div>
              <span className="text-xs font-mono text-foreground">
                {(rec.confidence * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Thesis preview */}
        <p
          className={`text-sm text-muted-foreground ${!expanded ? "line-clamp-2" : ""}`}
        >
          {rec.thesis}
        </p>

        {/* Time horizon + related assets */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="border-zinc-600 text-xs">
            {rec.timeHorizon}
          </Badge>
          {rec.relatedAssets?.slice(0, 5).map((ra, i) => (
            <Badge
              key={i}
              variant="outline"
              className={`text-xs ${ACTION_CONFIG[ra.action]?.className || ""}`}
            >
              {ra.assetId} — {ra.action}
            </Badge>
          ))}
        </div>

        {/* Expanded content */}
        {expanded && (
          <div className="mt-4 space-y-4">
            {/* Evidence */}
            {rec.evidence && rec.evidence.length > 0 && (
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                  Evidence
                </h4>
                <div className="space-y-2">
                  {rec.evidence.map((e, i) => (
                    <div
                      key={i}
                      className="flex gap-2 rounded-md border border-border/50 bg-zinc-900/50 p-2"
                    >
                      <Badge
                        variant="outline"
                        className="h-fit text-[10px] shrink-0"
                      >
                        {e.type}
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        {e.detail}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Risk Assessment */}
            <div>
              <h4 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                Risk Assessment
              </h4>
              <p className="text-xs text-red-400/80">{rec.riskAssessment}</p>
            </div>

            {/* Accuracy score if scored */}
            {rec.accuracyScore !== null && (
              <div>
                <h4 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                  Accuracy Score
                </h4>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-24 rounded-full bg-zinc-800">
                    <div
                      className={`h-full rounded-full ${getConfidenceColor(rec.accuracyScore)}`}
                      style={{
                        width: `${rec.accuracyScore * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs font-mono">
                    {(rec.accuracyScore * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            )}

            {/* Outcome notes */}
            {rec.outcomeNotes && (
              <div>
                <h4 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                  Outcome Notes
                </h4>
                <p className="text-xs text-muted-foreground">
                  {rec.outcomeNotes}
                </p>
              </div>
            )}

            {/* Actions */}
            {rec.status === "active" && (
              <div className="flex gap-2 pt-2">
                {onMarkReviewed && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => onMarkReviewed(rec.id)}
                  >
                    <Eye className="mr-1 h-3 w-3" />
                    Mark Reviewed
                  </Button>
                )}
                {onDismiss && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs text-red-400 hover:text-red-300"
                    onClick={() => onDismiss(rec.id)}
                  >
                    <XCircle className="mr-1 h-3 w-3" />
                    Dismiss
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Expand/Collapse toggle */}
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 h-6 w-full text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <>
              <ChevronUp className="mr-1 h-3 w-3" /> Collapse
            </>
          ) : (
            <>
              <ChevronDown className="mr-1 h-3 w-3" /> Show details
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
