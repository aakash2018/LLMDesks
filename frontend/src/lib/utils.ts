import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(dateString));
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateString);
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    ACTIVE: "text-green-600 bg-green-50 dark:bg-green-950 dark:text-green-400",
    DRAFT: "text-yellow-600 bg-yellow-50 dark:bg-yellow-950 dark:text-yellow-400",
    INACTIVE: "text-gray-500 bg-gray-50 dark:bg-gray-950 dark:text-gray-400",
  };
  return map[status] ?? "text-muted-foreground bg-muted";
}

export function getPatternColor(pattern: string): string {
  const map: Record<string, string> = {
    RAG: "text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400",
    SQL_AGENT: "text-purple-600 bg-purple-50 dark:bg-purple-950 dark:text-purple-400",
    MULTI_AGENT_RAG: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950 dark:text-indigo-400",
    WORKFLOW_AGENT: "text-orange-600 bg-orange-50 dark:bg-orange-950 dark:text-orange-400",
    TOOL_CALLING_AGENT: "text-pink-600 bg-pink-50 dark:bg-pink-950 dark:text-pink-400",
  };
  return map[pattern] ?? "text-muted-foreground bg-muted";
}

export function truncate(str: string, n: number): string {
  return str.length > n ? str.slice(0, n - 1) + "…" : str;
}

export function slugify(text: string): string {
  return text.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]+/g, "");
}
