// ─── Agent Types ──────────────────────────────────────────────────────────────

export type AgentPattern =
  | "RAG"
  | "SQL_AGENT"
  | "MULTI_AGENT_RAG"
  | "WORKFLOW_AGENT"
  | "TOOL_CALLING_AGENT";

export type AgentStatus = "DRAFT" | "ACTIVE" | "INACTIVE";

export interface AgentConfig {
  id: string;
  agent_id: string;
  prompt: string | null;
  welcome_message: string | null;
  llm_model: string;
  allow_file_upload: boolean;
  created_at: string;
  updated_at: string;
}

export interface Agent {
  id: string;
  agent_name: string;
  agent_slug: string;
  description: string | null;
  pattern: AgentPattern;
  status: AgentStatus;
  features: string[] | null;
  user_interface: string | null;
  api_interface: boolean;
  created_at: string;
  updated_at: string;
  config: AgentConfig | null;
}

export interface AgentListResponse {
  items: Agent[];
  total: number;
  page: number;
  page_size: number;
  has_next: boolean;
}

// ─── Agent Form Types ─────────────────────────────────────────────────────────

export interface AgentFormStep1 {
  agent_name: string;
  description: string;
  pattern: AgentPattern;
}

export interface AgentFormStep2 {
  features: string[];
  user_interface: string;
  api_interface: boolean;
}

export interface AgentFormStep3 {
  prompt_customization: string;
  bot_welcome_message: string;
  llm_model: string;
  allow_file_upload_chat: boolean;
}

export interface AgentFormData extends AgentFormStep1, AgentFormStep2, AgentFormStep3 {}

// ─── Chat Types ───────────────────────────────────────────────────────────────

export interface ChatSession {
  id: string;
  agent_id: string;
  title: string;
  message_count: number;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface ChatHistoryResponse {
  sessions: ChatSession[];
  total: number;
}

// ─── Dropdown Types ───────────────────────────────────────────────────────────

export interface DropdownOption {
  value: string;
  label: string;
  description?: string;
}

// ─── Upload Types ─────────────────────────────────────────────────────────────

export interface UploadResponse {
  file_id: string;
  file_name: string;
  file_size: number;
  message: string;
}

export interface EmbeddingResponse {
  file_id: string;
  agent_id: string;
  vectors_stored: number;
  message: string;
}

// ─── API Response Types ───────────────────────────────────────────────────────

export interface ApiError {
  detail: string;
  status: number;
}
