import { apiFetch } from "@/lib/api/client";

export type SwapSuggestion = {
  id: string;
  repo: { id: string; full_name: string; url: string; description: string | null; language: string | null };
  replace: { project_id: string; title: string };
  gains: { skill: string; evidence: string | null }[];
  loses: string[];
  message: string;
};

export const getSwapSuggestions = (versionId: string) =>
  apiFetch<{ suggestions: SwapSuggestion[] }>(`/api/v1/resume/versions/${versionId}/swap-suggestions`, { cache: "no-store" });

export const applySwap = (versionId: string, repoId: string, replaceProjectId: string) =>
  apiFetch<{ new_project_id: string }>(`/api/v1/resume/versions/${versionId}/swaps`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repo_id: repoId, replace_project_id: replaceProjectId }),
  });
