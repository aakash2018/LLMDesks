"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, ChevronLeft, ChevronRight, Save, X, Loader2 } from "lucide-react";
import { createAgent } from "@/services/agentService";
import type { AgentFormData } from "@/types";
import { Step1BasicInfo } from "@/features/agents/steps/Step1BasicInfo";
import { Step2DataSource } from "@/features/agents/steps/Step2DataSource";
import { Step3AdvancedConfig } from "@/features/agents/steps/Step3AdvancedConfig";
import { Step4Summary } from "@/features/agents/steps/Step4Summary";

const STEPS = [
  { id: 1, label: "Basic Info", description: "Name & pattern" },
  { id: 2, label: "Data Source", description: "Features & interface" },
  { id: 3, label: "Configuration", description: "Prompt & LLM" },
  { id: 4, label: "Summary", description: "Review & create" },
];

const DEFAULT_FORM: AgentFormData = {
  agent_name: "",
  description: "",
  pattern: "RAG",
  features: [],
  user_interface: "chat",
  api_interface: false,
  prompt_customization: "",
  bot_welcome_message: "Hello! How can I help you today?",
  llm_model: "gpt-4o-mini",
  allow_file_upload_chat: true,
};

export default function CreateAgentPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<AgentFormData>(DEFAULT_FORM);
  const [stepErrors, setStepErrors] = useState<Partial<Record<keyof AgentFormData, string>>>({});

  const createMut = useMutation({
    mutationFn: createAgent,
    onSuccess: (agent) => {
      qc.invalidateQueries({ queryKey: ["agents"] });
      toast.success(`Agent "${agent.agent_name}" created!`);
      router.push("/agents");
    },
  });

  const updateField = (key: keyof AgentFormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setStepErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validateStep = (): boolean => {
    const errors: Partial<Record<keyof AgentFormData, string>> = {};
    if (step === 1) {
      if (!formData.agent_name.trim()) errors.agent_name = "Agent name is required";
      if (!formData.pattern) errors.pattern = "Please select a pattern";
    }
    setStepErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) setStep((s) => Math.min(4, s + 1));
  };

  const handleBack = () => setStep((s) => Math.max(1, s - 1));

  const handleSaveLater = () => {
    toast.info("Your progress has been noted. Returning to dashboard.");
    router.push("/agents");
  };

  const handleSubmit = () => createMut.mutate(formData);

  return (
    <div className="flex h-full flex-col">
      {/* ── Header ── */}
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Create Agent</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">Step {step} of {STEPS.length}</p>
          </div>
          <button
            onClick={() => router.push("/agents")}
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-accent transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Stepper */}
        <div className="mt-5 flex items-center gap-0">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex flex-1 items-center">
              <button
                onClick={() => s.id < step && setStep(s.id)}
                className="flex flex-col items-center gap-1 group"
                disabled={s.id > step}
              >
                <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all ${
                  s.id < step
                    ? "border-primary bg-primary text-primary-foreground"
                    : s.id === step
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-muted-foreground/30 bg-background text-muted-foreground"
                }`}>
                  {s.id < step ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <span className="text-xs font-semibold">{s.id}</span>
                  )}
                </div>
                <span className={`hidden text-xs font-medium sm:block ${
                  s.id === step ? "text-foreground" : "text-muted-foreground"
                }`}>
                  {s.label}
                </span>
              </button>

              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 transition-colors ${
                  s.id < step ? "bg-primary" : "bg-muted-foreground/20"
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Form Content ── */}
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-2xl px-6 py-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {step === 1 && (
                <Step1BasicInfo
                  data={formData}
                  errors={stepErrors}
                  onChange={updateField}
                />
              )}
              {step === 2 && (
                <Step2DataSource
                  data={formData}
                  errors={stepErrors}
                  onChange={updateField}
                />
              )}
              {step === 3 && (
                <Step3AdvancedConfig
                  data={formData}
                  errors={stepErrors}
                  onChange={updateField}
                />
              )}
              {step === 4 && (
                <Step4Summary data={formData} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ── Footer Actions ── */}
      <div className="border-t border-border bg-card px-6 py-4">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <div className="flex gap-2">
            <button
              onClick={handleBack}
              disabled={step === 1}
              className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
            <button
              onClick={handleSaveLater}
              className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent transition-colors"
            >
              <Save className="h-4 w-4" />
              Save & Continue Later
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => router.push("/agents")}
              className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            {step < 4 ? (
              <button
                onClick={handleNext}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={createMut.isPending}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
              >
                {createMut.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Creating...</>
                ) : (
                  <><Check className="h-4 w-4" /> Create Agent</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
