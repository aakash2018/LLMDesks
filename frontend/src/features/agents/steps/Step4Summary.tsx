"use client";

import { Check, Bot, Database, Settings, Zap } from "lucide-react";
import { cn, getPatternColor } from "@/lib/utils";
import type { AgentFormData } from "@/types";

interface Props {
  data: AgentFormData;
}

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground shrink-0 w-40">{label}</span>
      <span className="text-sm font-medium text-right">{value || <span className="text-muted-foreground italic">Not set</span>}</span>
    </div>
  );
}

function SummarySection({ icon: Icon, title, children }: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2.5 border-b border-border bg-muted/30 px-4 py-3">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="px-4">{children}</div>
    </div>
  );
}

export function Step4Summary({ data }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Review & Create</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Review your configuration before creating the agent.
        </p>
      </div>

      {/* Basic Info */}
      <SummarySection icon={Bot} title="Basic Information">
        <SummaryRow label="Agent Name" value={data.agent_name} />
        <SummaryRow label="Description" value={data.description || "—"} />
        <SummaryRow
          label="Pattern"
          value={
            <span className={cn(
              "inline-block rounded-full px-2.5 py-0.5 text-xs font-medium",
              getPatternColor(data.pattern)
            )}>
              {data.pattern}
            </span>
          }
        />
      </SummarySection>

      {/* Data Source */}
      <SummarySection icon={Database} title="Data Source">
        <SummaryRow
          label="Features"
          value={
            data.features && data.features.length > 0 ? (
              <div className="flex flex-wrap justify-end gap-1">
                {data.features.map((f) => (
                  <span key={f} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                    {f.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            ) : "None selected"
          }
        />
        <SummaryRow label="User Interface" value={data.user_interface || "chat"} />
        <SummaryRow
          label="API Interface"
          value={
            <span className={`flex items-center gap-1 text-xs font-medium ${data.api_interface ? "text-green-600" : "text-muted-foreground"}`}>
              {data.api_interface ? <><Check className="h-3 w-3" /> Enabled</> : "Disabled"}
            </span>
          }
        />
      </SummarySection>

      {/* Advanced Config */}
      <SummarySection icon={Settings} title="Advanced Configuration">
        <SummaryRow label="LLM Model" value={data.llm_model} />
        <SummaryRow
          label="Welcome Message"
          value={
            <span className="max-w-xs text-right leading-relaxed">
              {data.bot_welcome_message || "—"}
            </span>
          }
        />
        <SummaryRow
          label="System Prompt"
          value={
            data.prompt_customization
              ? `${data.prompt_customization.slice(0, 60)}${data.prompt_customization.length > 60 ? "…" : ""}`
              : "—"
          }
        />
        <SummaryRow
          label="File Upload in Chat"
          value={
            <span className={`flex items-center gap-1 text-xs font-medium ${data.allow_file_upload_chat ? "text-green-600" : "text-muted-foreground"}`}>
              {data.allow_file_upload_chat ? <><Check className="h-3 w-3" /> Enabled</> : "Disabled"}
            </span>
          }
        />
      </SummarySection>

      {/* Ready notice */}
      <div className="flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
        <Zap className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div>
          <p className="text-sm font-medium text-primary">Ready to create</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            After creation, activate the agent from the dashboard to start chatting. You can upload documents to the RAG pipeline from the agent settings.
          </p>
        </div>
      </div>
    </div>
  );
}
