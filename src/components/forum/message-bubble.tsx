"use client";

import { Badge } from "@/components/ui/badge";
import { Brain, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { MessageData } from "@/hooks/use-forum";

interface MessageBubbleProps {
  message: MessageData;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  if (isSystem) {
    return (
      <div className="flex justify-center py-2">
        <Badge
          variant="outline"
          className="border-zinc-700 bg-zinc-900/50 text-xs text-muted-foreground"
        >
          {message.content}
        </Badge>
      </div>
    );
  }

  return (
    <div
      className={`flex gap-3 py-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Avatar */}
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
          isUser ? "bg-blue-500/20 text-blue-400" : "bg-purple-500/20 text-purple-400"
        }`}
      >
        {isUser ? (
          <User className="h-3.5 w-3.5" />
        ) : (
          <Brain className="h-3.5 w-3.5" />
        )}
      </div>

      {/* Message content */}
      <div
        className={`max-w-[80%] rounded-lg px-4 py-2.5 ${
          isUser
            ? "bg-blue-500/10 text-foreground"
            : "bg-zinc-800/80 text-foreground"
        }`}
      >
        {/* Role label */}
        <div className="mb-1 flex items-center gap-2">
          <span
            className={`text-[10px] font-semibold uppercase ${
              isUser ? "text-blue-400" : "text-purple-400"
            }`}
          >
            {isUser ? "You" : "Strategist"}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {formatTime(message.createdAt)}
          </span>
          {message.tokenUsage && (
            <span className="text-[9px] text-muted-foreground">
              {message.tokenUsage.input + message.tokenUsage.output} tokens
              (${message.tokenUsage.cost?.toFixed(4)})
            </span>
          )}
        </div>

        {/* Content */}
        <div className="prose prose-sm prose-invert max-w-none text-sm leading-relaxed [&_table]:text-xs [&_th]:px-2 [&_td]:px-2 [&_code]:text-xs [&_pre]:text-xs">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {message.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

/** Streaming message bubble — shows content as it streams in. */
export function StreamingBubble({ content }: { content: string }) {
  return (
    <div className="flex gap-3 py-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-purple-400">
        <Brain className="h-3.5 w-3.5 animate-pulse" />
      </div>
      <div className="max-w-[80%] rounded-lg bg-zinc-800/80 px-4 py-2.5 text-foreground">
        <div className="mb-1">
          <span className="text-[10px] font-semibold uppercase text-purple-400">
            Strategist
          </span>
          <span className="ml-2 text-[10px] text-muted-foreground">
            thinking...
          </span>
        </div>
        <div className="prose prose-sm prose-invert max-w-none text-sm leading-relaxed">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          <span className="inline-block h-4 w-1.5 animate-pulse bg-purple-400/60" />
        </div>
      </div>
    </div>
  );
}
