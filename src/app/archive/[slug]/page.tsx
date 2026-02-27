"use client";

import { use } from "react";
import { useKnowledgeEntry } from "@/hooks/use-knowledge";
import { EntryDetail } from "@/components/archive/entry-detail";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ArchiveEntryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { data, isLoading, error } = useKnowledgeEntry(slug);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !data?.entry) {
    return (
      <div className="flex h-64 flex-col items-center justify-center space-y-4">
        <p className="text-sm text-muted-foreground">Entry not found</p>
        <Link href="/archive">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-1 h-3.5 w-3.5" />
            Back to Archive
          </Button>
        </Link>
      </div>
    );
  }

  return <EntryDetail entry={data.entry} related={data.related} />;
}
