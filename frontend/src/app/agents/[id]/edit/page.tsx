"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, ChevronLeft, Loader2, X, Save } from "lucide-react";
import { fetchAgent, updateAgent, fetchAgentPatterns, fetchFeatures, fetchLlmModels, fetchUserInterfaces } from "@/services/agentService";
import { cn, getPatternColor } from "@/lib/utils";
import type { AgentFormData } from "@/types";

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 rounded-full transition-colors",
        checked ? "bg-primary" : "bg-muted-foreground/30"
      )}
    >
      <span className={cn(
        "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
        checked ? "translate-x-5" : "translate-x-0.5"
      )} />
    </button>
  );
}

export default function EditAgentPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const [form, setForm] = useState<AgentFormData>({
    agent_name: "", description: "", pattern: "RAG",
    features: [], user_interface: "chat", api_interface: false,
    prompt_customization: "", bot_welcome_message: "",
    llm_model: "gpt-4o-mini", allow_file_upload_chat: true,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof AgentFormData, string>>>({});

  // Fetch agent data
  const { data: agent, isLoading } = useQuery({
    queryKey: ["agent", id],
    queryFn: () => fetchAgent(id),
    enabled: !!id,
  });

  // Fetch dropdown options
  const { data: patterns = [] } = useQuery({ queryKey: ["patterns"], queryFn: fetchAgentPatterns, staleTime: Infinity });
  const { data: features = [] } = useQuery({ queryKey: ["features"], queryFn: fetchFeatures, staleTime: Infinity });
  const { data: models = [] } = useQuery({ queryKey: ["models"], queryFn: fetchLlmModels, staleTime: Infinity });
  const { data: interfaces = [] } = useQuery({ queryKey: ["interfaces"], queryFn: fetchUserInterfaces, staleTime: Infinity });

  // Populate form when agent loads
  useEffect(() => {
    if (!agent) return;
    setForm({
      agent_name: agent.agent_name,
      description: agent.description ?? "",
      pattern: agent.pattern,
      features: agent.features ?? [],
      user_interface: agent.user_interface ?? "chat",
      api_interface: agent.api_interface,
      prompt_customization: agent.config?.prompt ?? "",
      bot_welcome_message: agent.config?.welcome_message ?? "",
      llm_model: agent.config?.llm_model ?? "gpt-4o-mini",
      allow_file_upload_chat: agent.config?.allow_file_upload ?? true,
    });
  }, [agent]);

  // Update mutation
  const mut = useMutation({
    mutationFn: (data: AgentFormData) => updateAgent(id, {
      agent_name: data.agent_name,
      description: data.description,
      pattern: data.pattern,
      features: data.features,
      user_interface: data.user_interface,
      api_interface: data.api_interface,
      config: {
        prompt: data.prompt_customization,
        welcome_message: data.bot_welcome_message,
        llm_model: data.llm_model,
        allow_file_upload: data.allow_file_upload_chat,
      },
    } as any),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["agents"] });
      qc.invalidateQueries({ queryKey: ["agent", id] });
      toast.success(`"${updated.agent_name}" updated!`);
      router.push("/agents");
    },
  });

  const set = (k: keyof AgentFormData, v: unknown) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: undefined }));
  };

  const toggleFeature = (v: string) => {
    const curr = form.features ?? [];
    set("features", curr.includes(v) ? curr.filter(f => f !== v) : [...curr, v]);
  };

  const validate = () => {
    const e: Partial<Record<keyof AgentFormData, string>> = {};
    if (!form.agent_name.trim()) e.agent_name = "Agent name is required";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSave = () => {
    if (validate()) mut.mutate(form);
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <p className="text-sm text-muted-foreground">Agent not found.</p>
        <button onClick={() => router.push("/agents")}
          className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90">
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/agents")}
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-accent transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-xl font-semibold">Edit Agent</h1>
              <p className="text-sm text-muted-foreground">{agent.agent_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => router.push("/agents")}
              className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent transition-colors">
              <X className="h-4 w-4" /> Cancel
            </button>
            <button onClick={handleSave} disabled={mut.isPending}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
              {mut.isPending
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
                : <><Save className="h-4 w-4" /> Save Changes</>
              }
            </button>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-2xl px-6 py-8 space-y-8">

          {/* ── Section 1: Basic Info ── */}
          <section className="space-y-5">
            <div className="border-b border-border pb-2">
              <h2 className="text-base font-semibold">Basic Information</h2>
              <p className="text-sm text-muted-foreground">Name and execution pattern of the agent.</p>
            </div>

            {/* Agent Name */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Agent Name <span className="text-destructive">*</span>
              </label>
              <input
                value={form.agent_name}
                onChange={e => set("agent_name", e.target.value)}
                placeholder="e.g. Customer Support Bot"
                className={cn(
                  "w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors",
                  errors.agent_name ? "border-destructive" : "border-border"
                )}
              />
              {errors.agent_name && <p className="text-xs text-destructive">{errors.agent_name}</p>}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Description</label>
              <textarea
                value={form.description}
                onChange={e => set("description", e.target.value)}
                placeholder="What does this agent do?"
                rows={3}
                className="w-full rounded-lg border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>

            {/* Pattern */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Agent Pattern</label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {patterns.map(p => (
                  <button key={p.value} type="button" onClick={() => set("pattern", p.value)}
                    className={cn(
                      "flex flex-col rounded-lg border p-3 text-left transition-all",
                      form.pattern === p.value
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:bg-accent"
                    )}>
                    <span className="text-sm font-medium">{p.label}</span>
                    {p.description && <span className="mt-0.5 text-xs text-muted-foreground">{p.description}</span>}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* ── Section 2: Data Source ── */}
          <section className="space-y-5">
            <div className="border-b border-border pb-2">
              <h2 className="text-base font-semibold">Data Source</h2>
              <p className="text-sm text-muted-foreground">Features and interface settings.</p>
            </div>

            {/* Features */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Features</label>
              <div className="grid grid-cols-2 gap-2">
                {features.map(f => {
                  const sel = (form.features ?? []).includes(f.value);
                  return (
                    <button key={f.value} type="button" onClick={() => toggleFeature(f.value)}
                      className={cn(
                        "rounded-lg border p-2.5 text-left text-xs transition-all",
                        sel ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:bg-accent"
                      )}>
                      <span className="font-medium">{f.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* User Interface */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">User Interface</label>
              <select
                value={form.user_interface}
                onChange={e => set("user_interface", e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {interfaces.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
              </select>
            </div>

            {/* API Interface */}
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <p className="text-sm font-medium">API Interface</p>
                <p className="text-xs text-muted-foreground">Expose this agent via REST API</p>
              </div>
              <Toggle checked={form.api_interface} onChange={v => set("api_interface", v)} />
            </div>
          </section>

          {/* ── Section 3: Configuration ── */}
          <section className="space-y-5">
            <div className="border-b border-border pb-2">
              <h2 className="text-base font-semibold">Configuration</h2>
              <p className="text-sm text-muted-foreground">Prompt, model, and chat options.</p>
            </div>

            {/* System Prompt */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">System Prompt</label>
              <textarea
                value={form.prompt_customization}
                onChange={e => set("prompt_customization", e.target.value)}
                placeholder="You are a helpful assistant specialised in..."
                rows={5}
                className="w-full rounded-lg border border-border px-3 py-2.5 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y"
              />
            </div>

            {/* Welcome Message */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Welcome Message</label>
              <textarea
                value={form.bot_welcome_message}
                onChange={e => set("bot_welcome_message", e.target.value)}
                placeholder="Hello! How can I help you today?"
                rows={2}
                className="w-full rounded-lg border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>

            {/* LLM Model */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">LLM Model</label>
              <select
                value={form.llm_model}
                onChange={e => set("llm_model", e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {models.map(m => (
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
                <p className="text-xs text-muted-foreground">Users can upload documents during chat</p>
              </div>
              <Toggle checked={form.allow_file_upload_chat} onChange={v => set("allow_file_upload_chat", v)} />
            </div>
          </section>

          {/* ── Status Info ── */}
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Current Status</span>
              <span className={cn(
                "rounded-full border px-2.5 py-0.5 text-xs font-medium",
                agent.status === "ACTIVE" ? "border-green-200 bg-green-50 text-green-600"
                  : agent.status === "DRAFT" ? "border-yellow-200 bg-yellow-50 text-yellow-600"
                  : "border-gray-200 bg-gray-50 text-gray-500"
              )}>
                {agent.status}
              </span>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Status can be changed from the dashboard using Activate / Deactivate buttons.
            </p>
          </div>

          {/* Bottom save button */}
          <div className="flex justify-end gap-3 pb-6">
            <button onClick={() => router.push("/agents")}
              className="rounded-lg border border-border px-5 py-2.5 text-sm hover:bg-accent transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} disabled={mut.isPending}
              className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
              {mut.isPending
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
                : <><Check className="h-4 w-4" /> Save Changes</>
              }
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
