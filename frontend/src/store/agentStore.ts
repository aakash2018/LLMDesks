import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { Agent } from "@/types";

interface AgentStore {
  // State
  agents: Agent[];
  selectedAgent: Agent | null;
  isLoading: boolean;
  searchQuery: string;
  statusFilter: string;
  currentPage: number;
  totalAgents: number;

  // Actions
  setAgents: (agents: Agent[], total: number) => void;
  setSelectedAgent: (agent: Agent | null) => void;
  setLoading: (loading: boolean) => void;
  setSearchQuery: (query: string) => void;
  setStatusFilter: (status: string) => void;
  setCurrentPage: (page: number) => void;
  updateAgent: (agent: Agent) => void;
  removeAgent: (id: string) => void;
  reset: () => void;
}

export const useAgentStore = create<AgentStore>()(
  devtools(
    (set) => ({
      agents: [],
      selectedAgent: null,
      isLoading: false,
      searchQuery: "",
      statusFilter: "",
      currentPage: 1,
      totalAgents: 0,

      setAgents: (agents, total) => set({ agents, totalAgents: total }),
      setSelectedAgent: (agent) => set({ selectedAgent: agent }),
      setLoading: (isLoading) => set({ isLoading }),
      setSearchQuery: (searchQuery) => set({ searchQuery, currentPage: 1 }),
      setStatusFilter: (statusFilter) => set({ statusFilter, currentPage: 1 }),
      setCurrentPage: (currentPage) => set({ currentPage }),

      updateAgent: (updatedAgent) =>
        set((state) => ({
          agents: state.agents.map((a) => (a.id === updatedAgent.id ? updatedAgent : a)),
          selectedAgent: state.selectedAgent?.id === updatedAgent.id ? updatedAgent : state.selectedAgent,
        })),

      removeAgent: (id) =>
        set((state) => ({
          agents: state.agents.filter((a) => a.id !== id),
          selectedAgent: state.selectedAgent?.id === id ? null : state.selectedAgent,
        })),

      reset: () =>
        set({
          agents: [],
          selectedAgent: null,
          isLoading: false,
          searchQuery: "",
          statusFilter: "",
          currentPage: 1,
          totalAgents: 0,
        }),
    }),
    { name: "agent-store" }
  )
);
