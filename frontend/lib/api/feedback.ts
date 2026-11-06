import { apiFetch } from "@/lib/api/client";

export type FeedbackKind = "feedback" | "bug";

/** Saves feedback or a bug report for the signed-in user (stored in the `feedbacks` table). */
export const submitFeedback = (kind: FeedbackKind, text: string, page?: string) =>
  apiFetch<{ id: string; created_at: string }>("/api/v1/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, text, page }),
  });
