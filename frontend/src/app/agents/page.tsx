"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus, Search, Filter, Bot, RefreshCw,
  Download, Upload, SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";

import { fetchAgents, activateAgent, deactivateAgent, deleteAgent,fetchAgent } from "@/services/agentService";
import { useAgentStore } from "@/store/agentStore";
import { AgentCard } from "@/features/agents/AgentCard";
import { AgentCardSkeleton } from "@/features/agents/AgentCardSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import type { Agent } from "@/types";

const STATUS_OPTIONS = ["", "ACTIVE", "DRAFT", "INACTIVE"];
const PATTERN_OPTIONS = ["", "RAG", "SQL_AGENT", "MULTI_AGENT_RAG", "WORKFLOW_AGENT", "TOOL_CALLING_AGENT"];

export default function AgentDashboard() {
  const router = useRouter();
  const qc = useQueryClient();
  const { searchQuery, statusFilter, setSearchQuery, setStatusFilter } = useAgentStore();
  const [page, setPage] = useState(1);

  // ── Fetch agents ──────────────────────────────────────────────────────────
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["agents", { search: searchQuery, status: statusFilter, page }],
    queryFn: () => fetchAgents({ search: searchQuery || undefined, status: statusFilter || undefined, page }),
    placeholderData: (prev) => prev,
  });

  const agents = data?.items ?? [];
  const total = data?.total ?? 0;

  // ── Mutations ─────────────────────────────────────────────────────────────
  const invalidate = () => qc.invalidateQueries({ queryKey: ["agents"] });

  const activateMut = useMutation({
    mutationFn: activateAgent,
    onSuccess: (agent) => { toast.success(`"${agent.agent_name}" activated`); invalidate(); },
  });

  const deactivateMut = useMutation({
    mutationFn: deactivateAgent,
    onSuccess: (agent) => { toast.success(`"${agent.agent_name}" deactivated`); invalidate(); },
  });

  const deleteMut = useMutation({
    mutationFn: deleteAgent,
    onSuccess: () => { toast.success("Agent deleted"); invalidate(); },
  });

  const handleLaunch = useCallback((agent: Agent) => {
    router.push(`/agents/${agent.id}/chat`);
  }, [router]);

  // const handleEdit = useCallback((agent: Agent) => {
  //   router.push(`/agents/${agent.id}/edit`);
  // }, [router]);
  const handleEditMut = useMutation({
    mutationFn: fetchAgent,
    onSuccess: (agent: Agent) => { 
      toast.success("Agent fetched"); invalidate(); 
      router.push(`/agents/${agent.id}/edit`);
    },
  });

  return (
    <div className="flex h-full flex-col">
      {/* ── Header ── */}
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Agent Dashboard</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {total} agent{total !== 1 ? "s" : ""} configured
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => invalidate()}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:bg-accent transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            </button>
            <Link
              href="/agents/create"
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Agent
            </Link>
          </div>
        </div>

        {/* ── Search & Filters ── */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search agents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.filter(Boolean).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Agent Grid ── */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <AgentCardSkeleton key={i} />)}
          </div>
        ) : agents.length === 0 ? (
          <EmptyState
            icon={Bot}
            title="No agents found"
            description={searchQuery ? "Try adjusting your search terms." : "Create your first agent to get started."}
            action={
              !searchQuery
                ? { label: "Create Agent", href: "/agents/create" }
                : undefined
            }
          />
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {agents.map((agent, i) => (
                <motion.div
                  key={agent.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <AgentCard
                    agent={agent}
                    onActivate={() => activateMut.mutate(agent.id)}
                    onDeactivate={() => deactivateMut.mutate(agent.id)}
                    onDelete={() => deleteMut.mutate(agent.id)}
                    onLaunch={() => handleLaunch(agent)}
                    onEdit={() => handleEditMut.mutate(agent.id)}
                    isLoading={
                      (activateMut.isPending && activateMut.variables === agent.id) ||
                      (deactivateMut.isPending && deactivateMut.variables === agent.id) ||
                      (deleteMut.isPending && deleteMut.variables === agent.id)
                    }
                  />
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}

        {/* ── Pagination ── */}
        {data && data.total > data.page_size && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent disabled:opacity-40 transition-colors"
            >
              Previous
            </button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {Math.ceil(data.total / data.page_size)}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!data.has_next}
              className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent disabled:opacity-40 transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
