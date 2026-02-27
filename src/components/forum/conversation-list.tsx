"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  Search,
  MessageSquare,
  Archive,
  Globe,
  Target,
  BarChart3,
  Lightbulb,
} from "lucide-react";
import type { ConversationData } from "@/hooks/use-forum";

interface ConversationListProps {
  conversations: ConversationData[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onArchive: (id: string) => void;
  searchResults?: ConversationData[];
}

const TYPE_ICONS: Record<string, typeof MessageSquare> = {
  general: MessageSquare,
  scenario_planning: Target,
  portfolio_review: BarChart3,
  strategy_session: Lightbulb,
};

const TYPE_LABELS: Record<string, string> = {
  general: "General",
  scenario_planning: "Scenarios",
  portfolio_review: "Review",
  strategy_session: "Strategy",
};

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString("en-GB", {
    month: "short",
    day: "numeric",
  });
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  onNew,
  onArchive,
  searchResults,
}: ConversationListProps) {
  const [search, setSearch] = useState("");

  const displayList = search.length >= 2 && searchResults
    ? searchResults
    : conversations;

  return (
    <div className="flex h-full flex-col border-r border-border/50">
      {/* Header */}
      <div className="border-b border-border/50 p-3">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">
            Conversations
          </h2>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onNew}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        <div className="space-y-0.5 p-2">
          {displayList.length === 0 ? (
            <div className="px-3 py-8 text-center text-xs text-muted-foreground">
              {search ? "No matching conversations" : "No conversations yet"}
            </div>
          ) : (
            displayList.map((conv) => {
              const Icon = TYPE_ICONS[conv.type] || MessageSquare;
              const isSelected = conv.id === selectedId;

              return (
                <button
                  key={conv.id}
                  onClick={() => onSelect(conv.id)}
                  className={`group flex w-full items-start gap-2.5 rounded-md px-3 py-2.5 text-left transition-colors ${
                    isSelected
                      ? "bg-zinc-800 text-foreground"
                      : "text-muted-foreground hover:bg-zinc-900 hover:text-foreground"
                  }`}
                >
                  <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium">
                      {conv.title}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <Badge
                        variant="outline"
                        className="h-4 px-1 text-[9px] border-zinc-700"
                      >
                        {TYPE_LABELS[conv.type] || conv.type}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {relativeTime(conv.updatedAt || conv.createdAt)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onArchive(conv.id);
                    }}
                    className="mt-0.5 hidden h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-foreground group-hover:flex"
                  >
                    <Archive className="h-3 w-3" />
                  </button>
                </button>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
