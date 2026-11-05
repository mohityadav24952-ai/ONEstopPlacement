import { apiFetch } from "@/lib/api/client";
import type { Proposal } from "@/lib/api/profile";

/** Data found in a user's first parsed resume that is waiting for approval. */
export type IntakeRequest = {
  id: string;
  kind: "CODING_ACCOUNT" | "PROFILE_FIELD";
  payload: { platform?: "LEETCODE" | "CODECHEF" | "HACKERRANK" | "GITHUB"; username?: string; label?: string; field?: string; value?: string };
  status: "PENDING" | "FAILED" | "APPROVED" | "REJECTED";
  message: string | null;
};

export type IntakeState = { requests: IntakeRequest[]; proposals: Proposal[]; total: number };

export const getIntake = () => apiFetch<IntakeState>("/api/v1/intake", { cache: "no-store" });

// Connecting accounts fetches live data, so approving can take a while.
export const approveAll = () =>
  apiFetch<{ approved: number; failed: number; skipped: number }>("/api/v1/intake/approve-all", { method: "POST", timeoutMs: 120000 });

export const rejectAll = () => apiFetch<{ rejected: number }>("/api/v1/intake/reject-all", { method: "POST" });

export const decideRequest = (id: string, decision: "approve" | "reject") =>
  apiFetch<IntakeRequest>(`/api/v1/intake/requests/${id}/${decision}`, { method: "POST", timeoutMs: 60000 });

/** Fire this (e.g. after a resume is parsed) to make an open panel re-check what is waiting. */
export const INTAKE_CHANGED = "intake-changed";
/** The panel fires this after approving, so the page it sits on reloads its own data. */
export const INTAKE_APPLIED = "intake-applied";
