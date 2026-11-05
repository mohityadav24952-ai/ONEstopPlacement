import { apiFetch } from "@/lib/api/client";
import type { Proposal } from "@/lib/api/profile";

export type Platform = "GITHUB" | "LEETCODE" | "CODECHEF" | "HACKERRANK";

export type Metric = { value: number | string | null; available: boolean };

export type PlatformEntry =
  | { platform: Platform; connected: false; manual_only?: boolean }
  | {
      platform: Platform;
      connected: true;
      username: string;
      source_method: "OFFICIAL_API" | "PUBLIC_PROFILE" | "MANUAL" | null;
      status: "OK" | "STALE" | "PARTIAL" | "ERROR" | "NOT_FOUND";
      fetched_at: string | null;
      metrics: Record<string, Metric>;
      languages: Record<string, number> | null;
      profile_url: string | null;
      warnings: string[];
    };

export type RepoSummary = {
  id: string;
  full_name: string;
  description: string | null;
  url: string;
  language: string | null;
  stars: number;
  topics: string[];
  pushed_at: string | null;
  fetched_at: string;
  is_fork: boolean;
  is_archived: boolean;
  /** First 400 characters of the project's README, or null. */
  readme_excerpt: string | null;
};

export type ManualStats = {
  username: string;
  problems_solved_total?: number;
  rating_current?: number;
  rating_max?: number;
  contests_count?: number;
  stars?: number;
};

const json = { "Content-Type": "application/json" };

export const getDashboard = () =>
  apiFetch<PlatformEntry[]>("/api/v1/coding/dashboard", { cache: "no-store" });

export const connectGithub = (username: string) =>
  apiFetch<PlatformEntry>("/api/v1/coding/accounts/GITHUB", {
    method: "PUT",
    headers: json,
    body: JSON.stringify({ username }),
    timeoutMs: 20000,
  });

/** Fetches the public profile of LeetCode, CodeChef or HackerRank. GitHub keeps connectGithub. */
export const connectPlatform = (platform: Exclude<Platform, "GITHUB">, username: string) =>
  apiFetch<PlatformEntry>(`/api/v1/coding/accounts/${platform}`, {
    method: "PUT",
    headers: json,
    body: JSON.stringify({ username }),
    timeoutMs: 25000,
  });

export const saveManual = (platform: Platform, body: ManualStats) =>
  apiFetch<PlatformEntry>(`/api/v1/coding/accounts/${platform}/manual`, {
    method: "PUT",
    headers: json,
    body: JSON.stringify(body),
  });

export const refreshAccount = (platform: Platform) =>
  apiFetch<PlatformEntry>(`/api/v1/coding/accounts/${platform}/refresh`, {
    method: "POST",
    timeoutMs: 20000,
  });

export const disconnectAccount = (platform: Platform, deleteData: boolean) =>
  apiFetch<void>(
    `/api/v1/coding/accounts/${platform}?delete_data=${deleteData}`,
    { method: "DELETE" },
  );

export const listRepositories = () =>
  apiFetch<RepoSummary[]>("/api/v1/coding/repositories", {
    cache: "no-store",
  });

export const proposeProject = (repoId: string) =>
  apiFetch<Proposal>(`/api/v1/coding/repositories/${repoId}/propose-project`, {
    method: "POST",
  });
