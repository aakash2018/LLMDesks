"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchLlmModels } from "@/services/agentService";
import type { AgentFormData } from "@/types";

interface Props {
  data: AgentFormData;
  errors: Partial<Record<keyof AgentFormData, string>>;
  onChange: (key: keyof AgentFormData, value: unknown) => void;
}

export function Step3AdvancedConfig({ data, errors, onChange }: Props) {
  const { data: models = [] } = useQuery({
    queryKey: ["dropdowns", "llm-models"],
    queryFn: fetchLlmModels,
    staleTime: Infinity,
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Advanced Configuration</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Customise the agent's behaviour, prompt, and language model.
        </p>
      </div>

      {/* System Prompt */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">System Prompt</label>
        <p className="text-xs text-muted-foreground">
          Instructions that define the agent's personality and behaviour.
        </p>
        <textarea
          value={data.prompt_customization}
          onChange={(e) => onChange("prompt_customization", e.target.value)}
          placeholder="You are a helpful assistant specialised in..."
          rows={5}
          className="w-full rounded-lg border border-border px-3 py-2.5 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y"
        />
      </div>

      {/* Welcome Message */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Welcome Message</label>
        <textarea
          value={data.bot_welcome_message}
          onChange={(e) => onChange("bot_welcome_message", e.target.value)}
          placeholder="Hello! How can I help you today?"
          rows={2}
          className="w-full rounded-lg border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
      </div>

      {/* LLM Model */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Language Model</label>
        <select
          value={data.llm_model}
          onChange={(e) => onChange("llm_model", e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {models.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}{m.description ? ` — ${m.description}` : ""}
            </option>
          ))}
        </select>
      </div>

      {/* File Upload Toggle */}
      <div className="flex items-center justify-between rounded-lg border border-border p-4">
        <div>
          <p className="text-sm font-medium">Allow File Upload in Chat</p>
          <p className="text-xs text-muted-foreground">Users can upload documents during conversation</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={data.allow_file_upload_chat}
          onClick={() => onChange("allow_file_upload_chat", !data.allow_file_upload_chat)}
          className={`relative h-6 w-11 rounded-full transition-colors ${
            data.allow_file_upload_chat ? "bg-primary" : "bg-muted-foreground/30"
          }`}
        >
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
            data.allow_file_upload_chat ? "translate-x-5" : "translate-x-0.5"
          }`} />
        </button>
      </div>
    </div>
  );
}
