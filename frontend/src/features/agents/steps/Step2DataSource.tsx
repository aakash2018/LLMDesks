"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchFeatures, fetchUserInterfaces } from "@/services/agentService";
import type { AgentFormData } from "@/types";

interface Props {
  data: AgentFormData;
  errors: Partial<Record<keyof AgentFormData, string>>;
  onChange: (key: keyof AgentFormData, value: unknown) => void;
}

export function Step2DataSource({ data, errors, onChange }: Props) {
  const { data: features = [] } = useQuery({
    queryKey: ["dropdowns", "features"],
    queryFn: fetchFeatures,
    staleTime: Infinity,
  });

  const { data: interfaces = [] } = useQuery({
    queryKey: ["dropdowns", "user-interfaces"],
    queryFn: fetchUserInterfaces,
    staleTime: Infinity,
  });

  const toggleFeature = (value: string) => {
    const current = data.features ?? [];
    const next = current.includes(value)
      ? current.filter((f) => f !== value)
      : [...current, value];
    onChange("features", next);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Data Source</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure what capabilities and interfaces this agent exposes.
        </p>
      </div>

      {/* Features */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Features</label>
        <p className="text-xs text-muted-foreground">Select all capabilities this agent should support.</p>
        <div className="grid grid-cols-2 gap-2">
          {features.map((f) => {
            const selected = (data.features ?? []).includes(f.value);
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => toggleFeature(f.value)}
                className={`flex flex-col rounded-lg border p-3 text-left transition-all ${
                  selected
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:bg-accent"
                }`}
              >
                <span className="text-sm font-medium">{f.label}</span>
                {f.description && <span className="mt-0.5 text-xs text-muted-foreground">{f.description}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* User Interface */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">User Interface</label>
        <select
          value={data.user_interface}
          onChange={(e) => onChange("user_interface", e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {interfaces.map((i) => (
            <option key={i.value} value={i.value}>{i.label}</option>
          ))}
        </select>
      </div>

      {/* API Interface toggle */}
      <div className="flex items-center justify-between rounded-lg border border-border p-4">
        <div>
          <p className="text-sm font-medium">API Interface</p>
          <p className="text-xs text-muted-foreground">Expose this agent via REST API endpoint</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={data.api_interface}
          onClick={() => onChange("api_interface", !data.api_interface)}
          className={`relative h-6 w-11 rounded-full transition-colors ${
            data.api_interface ? "bg-primary" : "bg-muted-foreground/30"
          }`}
        >
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
            data.api_interface ? "translate-x-5" : "translate-x-0.5"
          }`} />
        </button>
      </div>
    </div>
  );
}
