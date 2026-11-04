import { apiFetch } from "@/lib/api/client";

export type NextAction = { id: string; title: string; description: string; href: string };

export type HomeSummary = {
  profile: { percent: number; pending_proposals: number } | null;
  coding: { connected: number; stale: number; repositories: number } | null;
  resume: { drafts: number; approved: number; stale_approved: number } | null;
  interview: { sessions: number; percent_done: number } | null;
  portfolio: { portfolios: number; approved: number; stale_approved: number } | null;
  unavailable: string[];
  next_actions: NextAction[];
};

export const getHome = () => apiFetch<HomeSummary>("/api/v1/home", { cache: "no-store" });

export const exportMyData = () =>
  apiFetch<Record<string, unknown>>("/api/v1/me/export", { method: "POST", timeoutMs: 20000 });

export const deleteAccount = (confirm: string) =>
  apiFetch<void>("/api/v1/me", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ confirm }),
    timeoutMs: 30000,
  });
