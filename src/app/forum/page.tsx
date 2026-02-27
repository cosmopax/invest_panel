"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PanelRightClose,
  PanelRightOpen,
  MessageSquare,
  Plus,
} from "lucide-react";
import { ConversationList } from "@/components/forum/conversation-list";
import {
  MessageBubble,
  StreamingBubble,
} from "@/components/forum/message-bubble";
import { ChatInput } from "@/components/forum/chat-input";
import { ContextSidebar } from "@/components/forum/context-sidebar";
import {
  useConversations,
  useConversation,
  useConversationSearch,
  useCreateConversation,
  useArchiveConversation,
  useChat,
} from "@/hooks/use-forum";
import { useUIStore } from "@/stores/ui-store";

const CONVERSATION_TYPES = [
  {
    value: "general",
    label: "General",
    description: "Open-ended discussion",
  },
  {
    value: "scenario_planning",
    label: "Scenario Planning",
    description: "Future scenarios with probabilities",
  },
  {
    value: "portfolio_review",
    label: "Portfolio Review",
    description: "Position analysis and rebalancing",
  },
  {
    value: "strategy_session",
    label: "Strategy Session",
    description: "Deep macro analysis",
  },
];

const PROVIDER_OPTIONS = [
  { value: "claude", label: "Claude", description: "Deep reasoning (Opus)" },
  { value: "gemini", label: "Gemini", description: "Fast analysis (Pro)" },
  { value: "codex", label: "Codex", description: "Analytical (GPT-5.3)" },
];

export default function ForumPage() {
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [newConvOpen, setNewConvOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState("general");
  const [newProvider, setNewProvider] = useState("claude");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const contextVisible = useUIStore((s) => s.forumContextVisible);
  const toggleContext = useUIStore((s) => s.toggleForumContext);

  const { data: convData, isLoading: convsLoading } = useConversations();
  const { data: convDetail, isLoading: detailLoading } =
    useConversation(selectedConvId);
  const { data: searchData } = useConversationSearch(searchQuery);
  const createConv = useCreateConversation();
  const archiveConv = useArchiveConversation();

  const convType = convDetail?.conversation?.type || "general";
  const convProvider = convDetail?.conversation?.preferredProvider || "claude";
  const { sendMessage, isStreaming, streamingContent, cancel } = useChat(
    selectedConvId || "",
    convType,
    convProvider,
  );

  const conversations = convData?.conversations ?? [];
  const messageList = convDetail?.messages ?? [];

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messageList.length, streamingContent]);

  const handleCreateConversation = async () => {
    if (!newTitle.trim()) return;
    const result = await createConv.mutateAsync({
      title: newTitle.trim(),
      type: newType,
      preferredProvider: newProvider,
    });
    setSelectedConvId(result.id);
    setNewConvOpen(false);
    setNewTitle("");
    setNewType("general");
    setNewProvider("claude");
  };

  const handleSend = async (message: string) => {
    if (!selectedConvId) return;
    try {
      await sendMessage(message);
    } catch (error) {
      console.error("[Forum] Send failed:", error);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-0">
      {/* Left: Conversation List */}
      <div className="w-64 shrink-0">
        <ConversationList
          conversations={conversations}
          selectedId={selectedConvId}
          onSelect={setSelectedConvId}
          onNew={() => setNewConvOpen(true)}
          onArchive={(id) => {
            archiveConv.mutate(id);
            if (selectedConvId === id) setSelectedConvId(null);
          }}
          searchResults={searchData?.conversations}
        />
      </div>

      {/* Center: Chat Area */}
      <div className="flex flex-1 flex-col">
        {selectedConvId ? (
          <>
            {/* Chat header */}
            <div className="flex items-center justify-between border-b border-border/50 px-4 py-2.5">
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold text-foreground">
                  {convDetail?.conversation?.title || "Loading..."}
                </h2>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="h-4 px-1.5 text-[9px] border-zinc-700"
                  >
                    {convType}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="h-4 px-1.5 text-[9px] border-zinc-700 text-blue-400"
                  >
                    {convProvider}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {messageList.length} messages
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={toggleContext}
              >
                {contextVisible ? (
                  <PanelRightClose className="h-4 w-4" />
                ) : (
                  <PanelRightOpen className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 px-4">
              {detailLoading ? (
                <div className="space-y-4 py-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex gap-3">
                      <Skeleton className="h-7 w-7 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-16 w-80" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : messageList.length === 0 && !isStreaming ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <MessageSquare className="mb-3 h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">
                    Start a conversation with Strategist
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground/60">
                    Ask about portfolio strategy, macro outlook, or scenario
                    planning
                  </p>
                </div>
              ) : (
                <div className="py-4">
                  {messageList.map((msg) => (
                    <MessageBubble key={msg.id} message={msg} />
                  ))}
                  {isStreaming && streamingContent && (
                    <StreamingBubble content={streamingContent} />
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* Input */}
            <ChatInput
              onSend={handleSend}
              onCancel={cancel}
              isStreaming={isStreaming}
            />
          </>
        ) : (
          /* No conversation selected */
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <MessageSquare className="mb-4 h-12 w-12 text-muted-foreground/30" />
            <h2 className="text-lg font-medium text-muted-foreground">
              The Forum
            </h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground/70">
              Strategic conversations with the Strategist AI. Select a
              conversation or create a new one.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setNewConvOpen(true)}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              New Conversation
            </Button>
          </div>
        )}
      </div>

      {/* Right: Context Sidebar */}
      {contextVisible && selectedConvId && (
        <div className="w-56 shrink-0">
          <ContextSidebar />
        </div>
      )}

      {/* New Conversation Dialog */}
      <Dialog open={newConvOpen} onOpenChange={setNewConvOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Conversation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="conv-title">Title</Label>
              <Input
                id="conv-title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g., Q1 2026 Portfolio Review"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateConversation();
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Conversation Type</Label>
              <Select value={newType} onValueChange={setNewType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONVERSATION_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      <div>
                        <div className="font-medium">{t.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {t.description}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>AI Provider</Label>
              <Select value={newProvider} onValueChange={setNewProvider}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDER_OPTIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      <div>
                        <div className="font-medium">{p.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {p.description}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full"
              onClick={handleCreateConversation}
              disabled={!newTitle.trim() || createConv.isPending}
            >
              Create
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
