"use client";

import { Badge } from "@/components/ui/badge";

const DOMAIN_LABELS: Record<string, string> = {
  financial_math: "Financial Mathematics",
  behavioral_econ: "Behavioral Economics",
  macro: "Macroeconomic Models",
  futures_studies: "Futures Studies",
  game_theory: "Game Theory",
  complexity: "Complexity Science",
};

const DOMAIN_ICONS: Record<string, string> = {
  financial_math: "∑",
  behavioral_econ: "🧠",
  macro: "📊",
  futures_studies: "🔭",
  game_theory: "♟",
  complexity: "🌀",
};

interface DomainSidebarProps {
  taxonomy: Record<
    string,
    { total: number; subdomains: Record<string, number> }
  >;
  activeDomain: string | null;
  onDomainSelect: (domain: string | null) => void;
}

export function DomainSidebar({
  taxonomy,
  activeDomain,
  onDomainSelect,
}: DomainSidebarProps) {
  const domains = Object.entries(taxonomy).sort(
    ([, a], [, b]) => b.total - a.total,
  );

  return (
    <div className="space-y-1">
      {/* All */}
      <button
        onClick={() => onDomainSelect(null)}
        className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${
          activeDomain === null
            ? "bg-accent text-accent-foreground"
            : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
        }`}
      >
        <span>All Entries</span>
        <Badge variant="outline" className="text-[10px]">
          {Object.values(taxonomy).reduce((sum, d) => sum + d.total, 0)}
        </Badge>
      </button>

      {domains.map(([domain, data]) => (
        <div key={domain}>
          <button
            onClick={() =>
              onDomainSelect(activeDomain === domain ? null : domain)
            }
            className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${
              activeDomain === domain
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="text-xs">{DOMAIN_ICONS[domain] || "📖"}</span>
              <span>{DOMAIN_LABELS[domain] || domain}</span>
            </span>
            <Badge variant="outline" className="text-[10px]">
              {data.total}
            </Badge>
          </button>

          {/* Subdomains when active */}
          {activeDomain === domain &&
            Object.entries(data.subdomains).length > 0 && (
              <div className="ml-7 mt-1 space-y-0.5">
                {Object.entries(data.subdomains).map(([sub, count]) => (
                  <div
                    key={sub}
                    className="flex items-center justify-between rounded px-2 py-1 text-xs text-muted-foreground"
                  >
                    <span className="capitalize">
                      {sub.replace(/_/g, " ")}
                    </span>
                    <span>{count}</span>
                  </div>
                ))}
              </div>
            )}
        </div>
      ))}
    </div>
  );
}
