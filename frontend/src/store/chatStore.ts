import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { ChatMessage, ChatSession } from "@/types";

interface ChatStore {
  // State
  sessions: ChatSession[];
  activeSession: ChatSession | null;
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingContent: string;
  inputValue: string;

  // Actions
  setSessions: (sessions: ChatSession[]) => void;
  setActiveSession: (session: ChatSession | null) => void;
  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  appendStreamChunk: (chunk: string) => void;
  finalizeStreaming: (assistantMessage: ChatMessage) => void;
  setStreaming: (streaming: boolean) => void;
  setInputValue: (value: string) => void;
  addSession: (session: ChatSession) => void;
  reset: () => void;
}

const safeConcat = (prev: string, chunk: string): string => {
  if (prev && !prev.endsWith(" ") && !chunk.startsWith(" ")) {
    return prev + " " + chunk;
  }
  return prev + chunk;
};

export const useChatStore = create<ChatStore>()(
  devtools(
    (set) => ({
      sessions: [],
      activeSession: null,
      messages: [],
      isStreaming: false,
      streamingContent: "",
      inputValue: "",

      setSessions: (sessions) => set({ sessions }),
      setActiveSession: (activeSession) => set({ activeSession }),
      setMessages: (messages) => set({ messages }),

      addMessage: (message) =>
        set((state) => ({ messages: [...state.messages, message] })),

      appendStreamChunk: (chunk) =>
        set((state) => ({
          streamingContent: safeConcat(state.streamingContent, chunk)
        })),

      finalizeStreaming: (assistantMessage) =>
        set((state) => ({
          messages: [...state.messages, assistantMessage],
          streamingContent: "",
          isStreaming: false,
        })),

      setStreaming: (isStreaming) =>
        set({ isStreaming, streamingContent: isStreaming ? "" : "" }),

      setInputValue: (inputValue) => set({ inputValue }),

      addSession: (session) =>
        set((state) => ({ sessions: [session, ...state.sessions] })),

      reset: () =>
        set({
          sessions: [],
          activeSession: null,
          messages: [],
          isStreaming: false,
          streamingContent: "",
          inputValue: "",
        }),
    }),
    { name: "chat-store" }
  )
);
