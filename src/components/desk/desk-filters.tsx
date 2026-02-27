"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SlidersHorizontal } from "lucide-react";
import type { RecommendationFilters } from "@/hooks/use-recommendations";

interface DeskFiltersProps {
  filters: RecommendationFilters;
  onChange: (filters: RecommendationFilters) => void;
}

const HORIZONS = [
  { value: "", label: "All horizons" },
  { value: "days", label: "Days" },
  { value: "weeks", label: "Weeks" },
  { value: "months", label: "Months" },
  { value: "quarters", label: "Quarters" },
];

const AGENTS = [
  { value: "", label: "All agents" },
  { value: "scout", label: "Scout" },
  { value: "strategist", label: "Strategist" },
];

const STATUSES = [
  { value: "", label: "Active only" },
  { value: "all", label: "All statuses" },
  { value: "validated", label: "Validated" },
  { value: "invalidated", label: "Invalidated" },
  { value: "expired", label: "Expired" },
];

export function DeskFilters({ filters, onChange }: DeskFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />

      {/* Agent filter */}
      <Select
        value={filters.agentId || ""}
        onValueChange={(v) => onChange({ ...filters, agentId: v || undefined })}
      >
        <SelectTrigger className="h-8 w-[130px] text-xs">
          <SelectValue placeholder="Agent" />
        </SelectTrigger>
        <SelectContent>
          {AGENTS.map((a) => (
            <SelectItem key={a.value} value={a.value || "all-agents"}>
              {a.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Horizon filter */}
      <Select
        value={filters.horizon || ""}
        onValueChange={(v) => onChange({ ...filters, horizon: v || undefined })}
      >
        <SelectTrigger className="h-8 w-[140px] text-xs">
          <SelectValue placeholder="Time horizon" />
        </SelectTrigger>
        <SelectContent>
          {HORIZONS.map((h) => (
            <SelectItem key={h.value} value={h.value || "all-horizons"}>
              {h.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status filter */}
      <Select
        value={
          filters.showHistory
            ? filters.status || "all"
            : ""
        }
        onValueChange={(v) => {
          if (v === "" || v === "active") {
            onChange({ ...filters, status: undefined, showHistory: false });
          } else if (v === "all") {
            onChange({ ...filters, status: undefined, showHistory: true });
          } else {
            onChange({ ...filters, status: v, showHistory: true });
          }
        }}
      >
        <SelectTrigger className="h-8 w-[140px] text-xs">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          {STATUSES.map((s) => (
            <SelectItem key={s.value} value={s.value || "active"}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Confidence range */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground">Conf:</span>
        <input
          type="range"
          min="0"
          max="100"
          step="10"
          value={(filters.minConf ?? 0) * 100}
          onChange={(e) =>
            onChange({
              ...filters,
              minConf: parseInt(e.target.value) / 100 || undefined,
            })
          }
          className="h-1.5 w-20 cursor-pointer accent-blue-500"
        />
        <span className="text-xs font-mono text-muted-foreground">
          {((filters.minConf ?? 0) * 100).toFixed(0)}%+
        </span>
      </div>

      {/* Clear filters */}
      {(filters.agentId ||
        filters.horizon ||
        filters.status ||
        filters.showHistory ||
        (filters.minConf && filters.minConf > 0)) && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-muted-foreground"
          onClick={() => onChange({})}
        >
          Clear
        </Button>
      )}
    </div>
  );
}
