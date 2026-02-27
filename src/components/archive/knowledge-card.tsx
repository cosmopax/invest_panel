"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { KnowledgeEntry } from "@/lib/db/schema";

const DOMAIN_COLORS: Record<string, string> = {
  financial_math: "bg-blue-900/50 text-blue-300",
  behavioral_econ: "bg-purple-900/50 text-purple-300",
  macro: "bg-emerald-900/50 text-emerald-300",
  futures_studies: "bg-amber-900/50 text-amber-300",
  game_theory: "bg-red-900/50 text-red-300",
  complexity: "bg-cyan-900/50 text-cyan-300",
};

interface KnowledgeCardProps {
  entry: KnowledgeEntry;
}

export function KnowledgeCard({ entry }: KnowledgeCardProps) {
  const tags = (entry.tags as string[]) || [];

  return (
    <Link href={`/archive/${entry.slug}`}>
      <article className="group rounded-lg border border-border bg-card p-4 transition-colors hover:border-blue-500/50">
        <h3 className="text-sm font-medium text-foreground group-hover:text-blue-400 transition-colors">
          {entry.title}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {entry.summary}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Badge
            variant="outline"
            className={`text-[10px] ${DOMAIN_COLORS[entry.domain] || ""}`}
          >
            {entry.domain.replace(/_/g, " ")}
          </Badge>
          {entry.subdomain && (
            <Badge variant="outline" className="text-[10px]">
              {entry.subdomain.replace(/_/g, " ")}
            </Badge>
          )}
          {tags.slice(0, 2).map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className="text-[10px] text-muted-foreground"
            >
              {tag}
            </Badge>
          ))}
          {entry.year && (
            <span className="ml-auto text-[10px] text-muted-foreground">
              {entry.year}
            </span>
          )}
        </div>
      </article>
    </Link>
  );
}
