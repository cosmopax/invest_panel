"use client";

import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink, BookOpen } from "lucide-react";
import type { KnowledgeEntry } from "@/lib/db/schema";

// Dynamic import for KaTeX to avoid SSR issues
import dynamic from "next/dynamic";
const BlockMath = dynamic(
  () => import("react-katex").then((mod) => mod.BlockMath),
  { ssr: false, loading: () => <div className="h-16 animate-pulse rounded bg-muted" /> },
);

const DOMAIN_LABELS: Record<string, string> = {
  financial_math: "Financial Mathematics",
  behavioral_econ: "Behavioral Economics",
  macro: "Macroeconomic Models",
  futures_studies: "Futures Studies",
  game_theory: "Game Theory",
  complexity: "Complexity Science",
};

interface EntryDetailProps {
  entry: KnowledgeEntry;
  related: Array<{
    id: string;
    title: string;
    slug: string;
    domain: string;
    summary: string;
  }>;
}

export function EntryDetail({ entry, related }: EntryDetailProps) {
  const authors = (entry.authors as string[]) || [];
  const tags = (entry.tags as string[]) || [];

  return (
    <article className="space-y-8">
      {/* Back + Breadcrumb */}
      <div className="flex items-center gap-3">
        <Link href="/archive">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1 h-3.5 w-3.5" />
            Archive
          </Button>
        </Link>
        <span className="text-xs text-muted-foreground">/</span>
        <Badge variant="outline" className="text-xs">
          {DOMAIN_LABELS[entry.domain] || entry.domain}
        </Badge>
        {entry.subdomain && (
          <>
            <span className="text-xs text-muted-foreground">/</span>
            <span className="text-xs capitalize text-muted-foreground">
              {entry.subdomain.replace(/_/g, " ")}
            </span>
          </>
        )}
      </div>

      {/* Title + Meta */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          {entry.title}
        </h1>
        {authors.length > 0 && (
          <p className="mt-1 text-sm text-muted-foreground">
            {authors.join(", ")}
            {entry.year && ` (${entry.year})`}
          </p>
        )}
      </div>

      {/* Summary */}
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-sm leading-relaxed text-foreground">
          {entry.summary}
        </p>
      </div>

      {/* Explanation */}
      <section>
        <h2 className="mb-3 text-lg font-medium text-foreground">
          Explanation
        </h2>
        <div className="prose prose-sm prose-invert max-w-none prose-p:text-muted-foreground prose-headings:text-foreground prose-strong:text-foreground prose-li:text-muted-foreground">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {entry.explanation}
          </ReactMarkdown>
        </div>
      </section>

      {/* Mathematical Formulation */}
      {entry.mathematicalFormulation && (
        <section className="rounded-lg border border-border bg-slate-900/50 p-6">
          <h2 className="mb-4 text-lg font-medium text-foreground">
            Mathematical Formulation
          </h2>
          <div className="overflow-x-auto">
            {entry.mathematicalFormulation.split("\n\n").map((block, i) => (
              <div key={i} className="mb-3">
                <BlockMath math={block.trim()} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Practical Application */}
      <section>
        <h2 className="mb-3 text-lg font-medium text-foreground">
          Practical Application
        </h2>
        <div className="prose prose-sm prose-invert max-w-none prose-p:text-muted-foreground">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {entry.practicalApplication}
          </ReactMarkdown>
        </div>
      </section>

      {/* Limitations */}
      {entry.limitations && (
        <section>
          <h2 className="mb-3 text-lg font-medium text-foreground">
            Limitations
          </h2>
          <div className="prose prose-sm prose-invert max-w-none prose-p:text-muted-foreground">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {entry.limitations}
            </ReactMarkdown>
          </div>
        </section>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {/* Source */}
      {(entry.sourceUrl || entry.doi) && (
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <BookOpen className="h-4 w-4" />
          {entry.sourceUrl && (
            <a
              href={entry.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-blue-400 hover:underline"
            >
              Source
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
          {entry.doi && (
            <a
              href={`https://doi.org/${entry.doi}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-blue-400 hover:underline"
            >
              DOI: {entry.doi}
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      )}

      {/* Related Entries */}
      {related.length > 0 && (
        <section className="rounded-lg border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-medium text-foreground">
            Related Concepts
          </h3>
          <div className="space-y-2">
            {related.map((r) => (
              <Link
                key={r.id}
                href={`/archive/${r.slug}`}
                className="block rounded-md px-3 py-2 transition-colors hover:bg-accent/50"
              >
                <span className="text-sm font-medium text-blue-400">
                  {r.title}
                </span>
                <span className="ml-2 text-xs text-muted-foreground">
                  ({r.domain.replace(/_/g, " ")})
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
