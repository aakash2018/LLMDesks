"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Send, Plus, Bot, User, Paperclip, X, Loader2,
  ChevronLeft, MessageSquare, Trash2, FileText, History,
} from "lucide-react";
import { toast } from "sonner";

import { fetchAgent } from "@/services/agentService";
import {
  createChatSession,
  fetchChatHistory,
  fetchMessages,
  sendStreamingMessage,
  uploadChatFile,
} from "@/services/chatService";
import { useChatStore } from "@/store/chatStore";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { ChatMessage, ChatSession } from "@/types";

// ─── Typing Indicator ─────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
        <Bot className="h-4 w-4 text-primary" />
      </div>
      <div className="flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="typing-dot h-2 w-2 rounded-full bg-muted-foreground"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────
function MessageBubble({ message, isStreaming }: { message: ChatMessage; isStreaming?: boolean }) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex gap-3 px-4 py-2", isUser && "flex-row-reverse")}
    >
      <div className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
        isUser ? "bg-primary/10" : "bg-muted"
      )}>
        {isUser
          ? <User className="h-4 w-4 text-primary" />
          : <Bot className="h-4 w-4 text-muted-foreground" />}
      </div>

      <div className={cn(
        "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
        isUser
          ? "rounded-tr-sm bg-primary text-primary-foreground"
          : "rounded-tl-sm bg-muted text-foreground"
      )}>
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className={cn("prose prose-sm max-w-none dark:prose-invert", isStreaming && "streaming-cursor")}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main Chat Page ───────────────────────────────────────────────────────────
export default function ChatPage() {
  const { id: agentId } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    sessions, activeSession, messages, isStreaming, streamingContent,
    inputValue,
    setSessions, setActiveSession, setMessages, addMessage,
    appendStreamChunk, finalizeStreaming, setStreaming, setInputValue,
    addSession,
  } = useChatStore();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{ id: string; name: string } | null>(null);

  // ── Fetch agent info ──────────────────────────────────────────────────────
  const { data: agent } = useQuery({
    queryKey: ["agent", agentId],
    queryFn: () => fetchAgent(agentId),
  });

  // ── Fetch chat history ────────────────────────────────────────────────────
  const { data: history } = useQuery({
    queryKey: ["chat-history", agentId],
    queryFn: () => fetchChatHistory(agentId),
    enabled: !!agentId,
  });

  useEffect(() => {
    if (history?.sessions) setSessions(history.sessions);
  }, [history, setSessions]);

  // ── Load messages when session changes ────────────────────────────────────
  useEffect(() => {
    if (!activeSession) return;
    fetchMessages(activeSession.id).then(setMessages).catch(() => setMessages([]));
  }, [activeSession, setMessages]);

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  // ── New session ───────────────────────────────────────────────────────────
  const handleNewSession = useCallback(async () => {
    if (!agentId) return;
    try {
      const session = await createChatSession(agentId);
      addSession(session);
      setActiveSession(session);
      setMessages([]);
      qc.invalidateQueries({ queryKey: ["chat-history", agentId] });
    } catch {
      toast.error("Failed to create chat session");
    }
  }, [agentId, addSession, setActiveSession, setMessages, qc]);

  // ── Auto-create session on first load ────────────────────────────────────
  useEffect(() => {
    if (!activeSession && sessions.length === 0 && agentId) {
      handleNewSession();
    }
  }, [activeSession, sessions.length, agentId, handleNewSession]);

  // ── File attachment ───────────────────────────────────────────────────────
  const handleFileAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !agentId) return;

    setUploadingFile(true);
    try {
      const result = await uploadChatFile(agentId, file);
      setAttachedFile({ id: result.file_id, name: result.file_name });
      toast.success("File attached");
    } catch {
      toast.error("Failed to upload file");
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const content = inputValue.trim();
    if (!content || !activeSession || isStreaming) return;

    setInputValue("");
    const userMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      session_id: activeSession.id,
      role: "user",
      content,
      timestamp: new Date().toISOString(),
    };
    addMessage(userMessage);
    setStreaming(true);

    await sendStreamingMessage(
      activeSession.id,
      content,
      (chunk) => appendStreamChunk(chunk),
      () => {
        const assistantMsg: ChatMessage = {
          id: `assistant-${Date.now()}`,
          session_id: activeSession.id,
          role: "assistant",
          content: useChatStore.getState().streamingContent,
          timestamp: new Date().toISOString(),
        };
        finalizeStreaming(assistantMsg);
        setAttachedFile(null);
        qc.invalidateQueries({ queryKey: ["chat-history", agentId] });
      },
      (err) => {
        toast.error(err);
        setStreaming(false);
      }
    );
  }, [inputValue, activeSession, isStreaming, addMessage, setStreaming, appendStreamChunk, finalizeStreaming, setInputValue, qc, agentId]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const welcomeMessage = agent?.config?.welcome_message || "Hello! How can I help you today?";

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Sessions Sidebar ── */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 256, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="flex h-full flex-col border-r border-border bg-card overflow-hidden shrink-0"
          >
            {/* Sidebar header */}
            <div className="flex items-center justify-between border-b border-border px-3 py-3">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Chat History</span>
              </div>
              <button
                onClick={handleNewSession}
                className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                title="New chat"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {/* Session list */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {sessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <MessageSquare className="h-6 w-6 text-muted-foreground mb-2" />
                  <p className="text-xs text-muted-foreground">No chats yet</p>
                </div>
              ) : (
                sessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => setActiveSession(session)}
                    className={cn(
                      "w-full rounded-lg px-3 py-2.5 text-left transition-colors",
                      activeSession?.id === session.id
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-accent"
                    )}
                  >
                    <p className="truncate text-xs font-medium">{session.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {session.message_count} messages · {formatRelativeTime(session.updated_at)}
                    </p>
                  </button>
                ))
              )}
            </div>

            {/* Back to dashboard */}
            <div className="border-t border-border p-2">
              <button
                onClick={() => router.push("/agents")}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-accent transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Back to Dashboard
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── Main Chat Area ── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Chat header */}
        <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-accent transition-colors"
          >
            <History className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{agent?.agent_name ?? "Agent"}</p>
              <p className="text-xs text-muted-foreground">{agent?.pattern ?? ""}</p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <span className={cn(
              "h-2 w-2 rounded-full",
              agent?.status === "ACTIVE" ? "bg-green-500" : "bg-muted-foreground/30"
            )} />
            <span className="text-xs text-muted-foreground">{agent?.status ?? "—"}</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto py-4">
          {messages.length === 0 && !isStreaming ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <Bot className="h-7 w-7 text-primary" />
              </div>
              <div>
                <p className="font-semibold">{agent?.agent_name ?? "Agent"}</p>
                <p className="mt-1 text-sm text-muted-foreground">{welcomeMessage}</p>
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}

              {/* Streaming assistant message */}
              {isStreaming && streamingContent && (
                <MessageBubble
                  message={{
                    id: "streaming",
                    session_id: activeSession?.id ?? "",
                    role: "assistant",
                    content: streamingContent,
                    timestamp: new Date().toISOString(),
                  }}
                  isStreaming
                />
              )}

              {isStreaming && !streamingContent && <TypingIndicator />}
            </>
          )}
          <div ref={bottomRef} />
        </div>

        {/* File attachment preview */}
        {attachedFile && (
          <div className="flex items-center gap-2 border-t border-border bg-muted/30 px-4 py-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{attachedFile.name}</span>
            <button
              onClick={() => setAttachedFile(null)}
              className="ml-auto"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
        )}

        {/* Input area */}
        <div className="border-t border-border bg-card px-4 py-3">
          <div className="flex items-end gap-2">
            {/* File attach */}
            {agent?.config?.allow_file_upload && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.csv,.txt,.docx"
                  className="hidden"
                  onChange={handleFileAttach}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFile}
                  className="mb-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border hover:bg-accent disabled:opacity-50 transition-colors"
                >
                  {uploadingFile
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Paperclip className="h-4 w-4" />}
                </button>
              </>
            )}

            {/* Text input */}
            <div className="relative flex-1">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
                rows={1}
                disabled={isStreaming || !activeSession}
                className="w-full resize-none rounded-xl border border-border bg-background px-4 py-2.5 pr-12 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                style={{ maxHeight: 160 }}
              />
            </div>

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isStreaming || !activeSession}
              className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors"
            >
              {isStreaming
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Send className="h-4 w-4" />}
            </button>
          </div>

          <p className="mt-1.5 text-center text-xs text-muted-foreground">
            AI responses may be inaccurate. Verify important information.
          </p>
        </div>
      </div>
    </div>
  );
}
