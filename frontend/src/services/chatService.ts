import apiClient from "./apiClient";
import type { ChatSession, ChatMessage, ChatHistoryResponse } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ─── Session Management ───────────────────────────────────────────────────────

export async function createChatSession(agent_id: string, title?: string): Promise<ChatSession> {
  const { data } = await apiClient.post("/chat/session", { agent_id, title });
  return data;
}

export async function fetchChatHistory(agent_id: string): Promise<ChatHistoryResponse> {
  const { data } = await apiClient.get(`/chat/history/${agent_id}`);
  return data;
}

export async function fetchMessages(session_id: string): Promise<ChatMessage[]> {
  const { data } = await apiClient.get(`/chat/messages/${session_id}`);
  return data;
}

// ─── Streaming Message ────────────────────────────────────────────────────────

/**
 * Send a message and stream the response via SSE.
 * Calls onChunk for each streamed token, onDone when complete.
 */
export async function sendStreamingMessage(
  session_id: string,
  content: string,
  onChunk: (chunk: string) => void,
  onDone: () => void,
  onError: (error: string) => void,
): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/api/v1/chat/message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify({ session_id, content }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Request failed" }));
      onError(error.detail || "Failed to send message");
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      onError("No response stream");
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6).trim();
          if (data === "[DONE]") {
            onDone();
            return;
          }
          if (data.startsWith("[ERROR]")) {
            onError(data.slice(8));
            return;
          }
          // Restore escaped newlines
          onChunk(data.replace(/\\n/g, "\n"));
        }
      }
    }
    onDone();
  } catch (err) {
    onError(err instanceof Error ? err.message : "Network error");
  }
}

// ─── File Upload in Chat ──────────────────────────────────────────────────────

export async function uploadChatFile(
  agentId: string,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<{ file_id: string; file_name: string }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("agent_id", agentId);

  const { data } = await apiClient.post("/upload/file", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded * 100) / e.total));
    },
  });
  return data;
}
