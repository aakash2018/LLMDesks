"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Bot, Play, Edit2, Trash2, Zap, ZapOff,
  Calendar, MoreVertical, MessageSquare, Loader2,
} from "lucide-react";
import { cn, formatRelativeTime, getStatusColor, getPatternColor, truncate } from "@/lib/utils";
import type { Agent } from "@/types";

interface AgentCardProps {
  agent: Agent;
  onActivate: () => void;
  onDeactivate: () => void;
  onDelete: () => void;
  onLaunch: () => void;
  onEdit: () => void;
  isLoading?: boolean;
}

const PATTERN_LABELS: Record<string, string> = {
  RAG: "RAG",
  SQL_AGENT: "SQL",
  MULTI_AGENT_RAG: "Multi-RAG",
  WORKFLOW_AGENT: "Workflow",
  TOOL_CALLING_AGENT: "Tools",
};

export function AgentCard({
  agent,
  onActivate,
  onDeactivate,
  onDelete,
  onLaunch,
  onEdit,
  isLoading,
}: AgentCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isActive = agent.status === "ACTIVE";
  const isDraft = agent.status === "DRAFT";

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={cn(
        "relative flex flex-col rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md",
        isActive && "agent-card-active border-primary/30"
      )}
    >
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            isActive ? "bg-primary/10" : "bg-muted"
          )}>
            <Bot className={cn("h-5 w-5", isActive ? "text-primary" : "text-muted-foreground")} />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold leading-tight">{agent.agent_name}</h3>
            <span className={cn(
              "mt-0.5 inline-block rounded-full px-2 py-0.5 text-xs font-medium",
              getStatusColor(agent.status)
            )}>
              {agent.status}
            </span>
          </div>
        </div>

        {/* Kebab menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent transition-colors"
          >
            <MoreVertical className="h-4 w-4 text-muted-foreground" />
          </button>

          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="absolute right-0 top-8 z-20 w-36 rounded-lg border border-border bg-card shadow-lg"
              onMouseLeave={() => setMenuOpen(false)}
            >
              <button
                onClick={() => { onEdit(); setMenuOpen(false); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-accent transition-colors rounded-t-lg"
              >
                <Edit2 className="h-3 w-3" /> Edit
              </button>
              {isActive ? (
                <button
                  onClick={() => { onDeactivate(); setMenuOpen(false); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-accent transition-colors"
                >
                  <ZapOff className="h-3 w-3" /> Deactivate
                </button>
              ) : (
                <button
                  onClick={() => { onActivate(); setMenuOpen(false); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-accent transition-colors"
                >
                  <Zap className="h-3 w-3" /> Activate
                </button>
              )}
              <button
                onClick={() => { setConfirmDelete(true); setMenuOpen(false); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs text-destructive hover:bg-destructive/10 transition-colors rounded-b-lg"
              >
                <Trash2 className="h-3 w-3" /> Delete
              </button>
            </motion.div>
          )}
        </div>
      </div>

      {/* ── Description ── */}
      <p className="mt-3 text-xs text-muted-foreground leading-relaxed min-h-[2.5rem]">
        {agent.description ? truncate(agent.description, 90) : "No description provided."}
      </p>

      {/* ── Pattern badge ── */}
      <div className="mt-3">
        <span className={cn(
          "inline-block rounded-full px-2 py-0.5 text-xs font-medium",
          getPatternColor(agent.pattern)
        )}>
          {PATTERN_LABELS[agent.pattern] ?? agent.pattern}
        </span>
      </div>

      {/* ── Footer ── */}
      <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>{formatRelativeTime(agent.created_at)}</span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Activate button (shown when DRAFT/INACTIVE) */}
          {!isActive && (
            <button
              onClick={onActivate}
              disabled={isLoading}
              className="flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
              Activate
            </button>
          )}

          {/* Launch button (shown only when ACTIVE) */}
          {isActive && (
            <button
              onClick={onLaunch}
              disabled={isLoading}
              className="flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <MessageSquare className="h-3 w-3" />
              Launch
            </button>
          )}
        </div>
      </div>

      {/* ── Delete Confirmation ── */}
      {confirmDelete && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-xl bg-card/95 backdrop-blur-sm p-4 text-center"
        >
          <Trash2 className="h-6 w-6 text-destructive" />
          <p className="text-sm font-medium">Delete this agent?</p>
          <p className="text-xs text-muted-foreground">This will also remove all embeddings and chat history.</p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmDelete(false)}
              className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-accent"
            >
              Cancel
            </button>
            <button
              onClick={() => { onDelete(); setConfirmDelete(false); }}
              className="rounded-lg bg-destructive px-3 py-1.5 text-xs text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
