"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUIStore } from "@/stores/ui-store";
import { Search, X } from "lucide-react";
import { useState } from "react";

const CATEGORIES = [
  { value: "macro", label: "Macro" },
  { value: "geopolitics", label: "Geopolitics" },
  { value: "central_bank", label: "Central Bank" },
  { value: "tech", label: "Technology" },
  { value: "energy", label: "Energy" },
  { value: "regulatory", label: "Regulatory" },
  { value: "earnings", label: "Earnings" },
  { value: "market_structure", label: "Market Structure" },
];

const SENTIMENTS = [
  { value: "bullish", label: "Bullish", color: "text-emerald-400" },
  { value: "bearish", label: "Bearish", color: "text-red-400" },
  { value: "neutral", label: "Neutral", color: "text-slate-400" },
];

interface WireFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function WireFilters({ searchQuery, onSearchChange }: WireFiltersProps) {
  const filters = useUIStore((s) => s.activeWireFilters);
  const setFilters = useUIStore((s) => s.setWireFilters);
  const [localSearch, setLocalSearch] = useState(searchQuery);

  const toggleCategory = (cat: string) => {
    const current = filters.categories;
    const next = current.includes(cat)
      ? current.filter((c) => c !== cat)
      : [...current, cat];
    setFilters({ categories: next });
  };

  const toggleSentiment = (sent: string) => {
    setFilters({
      sentiment: filters.sentiment === sent ? null : sent,
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchChange(localSearch);
  };

  const clearFilters = () => {
    setFilters({
      categories: [],
      sentiment: null,
      minQuality: 1,
      assetId: null,
    });
    setLocalSearch("");
    onSearchChange("");
  };

  const hasActiveFilters =
    filters.categories.length > 0 ||
    filters.sentiment !== null ||
    searchQuery !== "";

  return (
    <div className="space-y-4">
      {/* Search */}
      <form onSubmit={handleSearch}>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search news..."
            className="h-9 pl-8 text-sm"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
          />
        </div>
      </form>

      {/* Categories */}
      <div>
        <Label className="mb-2 block text-xs text-muted-foreground">
          Categories
        </Label>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((cat) => (
            <Badge
              key={cat.value}
              variant={
                filters.categories.includes(cat.value) ? "default" : "outline"
              }
              className="cursor-pointer text-[10px] transition-colors"
              onClick={() => toggleCategory(cat.value)}
            >
              {cat.label}
            </Badge>
          ))}
        </div>
      </div>

      {/* Sentiment */}
      <div>
        <Label className="mb-2 block text-xs text-muted-foreground">
          Sentiment
        </Label>
        <div className="flex gap-1.5">
          {SENTIMENTS.map((s) => (
            <Badge
              key={s.value}
              variant={filters.sentiment === s.value ? "default" : "outline"}
              className={`cursor-pointer text-[10px] transition-colors ${
                filters.sentiment === s.value ? "" : s.color
              }`}
              onClick={() => toggleSentiment(s.value)}
            >
              {s.label}
            </Badge>
          ))}
        </div>
      </div>

      {/* Quality slider */}
      <div>
        <Label className="mb-2 block text-xs text-muted-foreground">
          Min Source Quality: {filters.minQuality}/10
        </Label>
        <input
          type="range"
          min={1}
          max={10}
          value={filters.minQuality}
          onChange={(e) =>
            setFilters({ minQuality: parseInt(e.target.value) })
          }
          className="w-full accent-blue-500"
        />
      </div>

      {/* Clear */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs text-muted-foreground"
          onClick={clearFilters}
        >
          <X className="mr-1 h-3 w-3" /> Clear all filters
        </Button>
      )}
    </div>
  );
}
