import apiClient from "./apiClient";
import type { Agent, AgentListResponse, AgentFormData, DropdownOption } from "@/types";

// ─── Agent CRUD ───────────────────────────────────────────────────────────────

export async function fetchAgents(params: {
  search?: string;
  status?: string;
  pattern?: string;
  page?: number;
  page_size?: number;
}): Promise<AgentListResponse> {
  const { data } = await apiClient.get("/agents", { params });
  return data;
}

export async function fetchAgent(id: string): Promise<Agent> {
  const { data } = await apiClient.get(`/agents/${id}`);
  return data;
}

export async function createAgent(formData: AgentFormData): Promise<Agent> {
  const payload = {
    agent_name: formData.agent_name,
    description: formData.description,
    pattern: formData.pattern,
    features: formData.features,
    user_interface: formData.user_interface,
    api_interface: formData.api_interface,
    config: {
      prompt: formData.prompt_customization,
      welcome_message: formData.bot_welcome_message,
      llm_model: formData.llm_model,
      allow_file_upload: formData.allow_file_upload_chat,
    },
  };
  const { data } = await apiClient.post("/agents", payload);
  return data;
}

export async function updateAgent(id: string, payload: Partial<AgentFormData>): Promise<Agent> {
  const { data } = await apiClient.put(`/agents/${id}`, payload);
  return data;
}

export async function deleteAgent(id: string): Promise<void> {
  await apiClient.delete(`/agents/${id}`);
}

export async function activateAgent(id: string): Promise<Agent> {
  const { data } = await apiClient.patch(`/agents/${id}/activate`);
  return data;
}

export async function deactivateAgent(id: string): Promise<Agent> {
  const { data } = await apiClient.patch(`/agents/${id}/deactivate`);
  return data;
}

// ─── Dropdowns ────────────────────────────────────────────────────────────────

export async function fetchAgentPatterns(): Promise<DropdownOption[]> {
  const { data } = await apiClient.get("/dropdowns/agent-patterns");
  return data;
}

export async function fetchFeatures(): Promise<DropdownOption[]> {
  const { data } = await apiClient.get("/dropdowns/features");
  return data;
}

export async function fetchLlmModels(): Promise<DropdownOption[]> {
  const { data } = await apiClient.get("/dropdowns/llm-models");
  return data;
}

export async function fetchUserInterfaces(): Promise<DropdownOption[]> {
  const { data } = await apiClient.get("/dropdowns/user-interfaces");
  return data;
}
