"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";

export interface ConversationData {
  id: string;
  title: string;
  type: string;
  preferredProvider?: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
}

export interface MessageData {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  agentId: string | null;
  toolCalls: unknown | null;
  tokenUsage: {
    input: number;
    output: number;
    model: string;
    cost: number;
  } | null;
  createdAt: string;
}

/** Fetch conversation list. */
export function useConversations(type?: string) {
  return useQuery<{ conversations: ConversationData[] }>({
    queryKey: ["conversations", type],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (type) params.set("type", type);
      const res = await fetch(`/api/conversations?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch conversations");
      return res.json();
    },
    refetchInterval: 30 * 1000,
  });
}

/** Fetch a single conversation with messages. */
export function useConversation(id: string | null) {
  return useQuery<{
    conversation: ConversationData;
    messages: MessageData[];
  }>({
    queryKey: ["conversation", id],
    queryFn: async () => {
      const res = await fetch(`/api/conversations?id=${id}`);
      if (!res.ok) throw new Error("Failed to fetch conversation");
      return res.json();
    },
    enabled: !!id,
  });
}

/** Search conversations via FTS5. */
export function useConversationSearch(query: string) {
  return useQuery<{ conversations: ConversationData[] }>({
    queryKey: ["conversationSearch", query],
    queryFn: async () => {
      const res = await fetch(
        `/api/conversations?q=${encodeURIComponent(query)}`,
      );
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
    enabled: query.length >= 2,
  });
}

/** Create a new conversation. */
export function useCreateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { title: string; type?: string; preferredProvider?: string }) => {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create conversation");
      return res.json() as Promise<{ id: string; title: string; type: string }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

/** Archive a conversation. */
export function useArchiveConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch("/api/conversations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isArchived: true }),
      });
      if (!res.ok) throw new Error("Failed to archive conversation");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

/** Send a message and stream the response. */
export function useChat(conversationId: string, conversationType: string, preferredProvider?: string) {
  const queryClient = useQueryClient();
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (message: string) => {
      setIsStreaming(true);
      setStreamingContent("");

      abortRef.current = new AbortController();

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId,
            message,
            conversationType,
            preferredProvider,
          }),
          signal: abortRef.current.signal,
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || "Chat request failed");
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let fullText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const data = JSON.parse(line.slice(6));
              if (data.text) {
                fullText += data.text;
                setStreamingContent(fullText);
              }
              if (data.done) {
                // Invalidate to refetch messages
                queryClient.invalidateQueries({
                  queryKey: ["conversation", conversationId],
                });
              }
              if (data.error) {
                throw new Error(data.error);
              }
            } catch (e) {
              // Ignore parse errors from incomplete chunks
              if (e instanceof SyntaxError) continue;
              throw e;
            }
          }
        }
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        throw error;
      } finally {
        setIsStreaming(false);
        setStreamingContent("");
        abortRef.current = null;
      }
    },
    [conversationId, conversationType, preferredProvider, queryClient],
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { sendMessage, isStreaming, streamingContent, cancel };
}
