"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchAgentPatterns } from "@/services/agentService";
import type { AgentFormData } from "@/types";

interface Props {
  data: AgentFormData;
  errors: Partial<Record<keyof AgentFormData, string>>;
  onChange: (key: keyof AgentFormData, value: unknown) => void;
}

export function Step1BasicInfo({ data, errors, onChange }: Props) {
  const { data: patterns = [], isLoading } = useQuery({
    queryKey: ["dropdowns", "agent-patterns"],
    queryFn: fetchAgentPatterns,
    staleTime: Infinity,
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Basic Information</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Give your agent a name and choose how it processes information.
        </p>
      </div>

      {/* Agent Name */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">
          Agent Name <span className="text-destructive">*</span>
        </label>
        <input
          type="text"
          value={data.agent_name}
          onChange={(e) => onChange("agent_name", e.target.value)}
          placeholder="e.g. Customer Support Bot"
          className={`w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors ${
            errors.agent_name ? "border-destructive" : "border-border"
          }`}
        />
        {errors.agent_name && (
          <p className="text-xs text-destructive">{errors.agent_name}</p>
        )}
        <p className="text-xs text-muted-foreground">Must be unique across your organization.</p>
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Description</label>
        <textarea
          value={data.description}
          onChange={(e) => onChange("description", e.target.value)}
          placeholder="What does this agent do? What data does it know about?"
          rows={3}
          className="w-full rounded-lg border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
      </div>

      {/* Agent Pattern */}
      <div className="space-y-2">
        <label className="text-sm font-medium">
          Agent Pattern <span className="text-destructive">*</span>
        </label>
        <p className="text-xs text-muted-foreground">
          Choose how this agent retrieves and processes information.
        </p>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {patterns.map((pattern) => (
              <button
                key={pattern.value}
                type="button"
                onClick={() => onChange("pattern", pattern.value)}
                className={`flex flex-col rounded-lg border p-3 text-left transition-all ${
                  data.pattern === pattern.value
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:border-primary/50 hover:bg-accent"
                }`}
              >
                <span className="text-sm font-medium">{pattern.label}</span>
                {pattern.description && (
                  <span className="mt-0.5 text-xs text-muted-foreground">{pattern.description}</span>
                )}
              </button>
            ))}
          </div>
        )}

        {errors.pattern && (
          <p className="text-xs text-destructive">{errors.pattern}</p>
        )}
      </div>
    </div>
  );
}
