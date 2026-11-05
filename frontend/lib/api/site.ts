import { apiFetch } from "@/lib/api/client";
import type { PortfolioData } from "@/types/portfolio";

/** Portfolio Site Builder API (/api/v1/portfolio-site). Separate from lib/api/portfolio.ts (drafts and exports). */
const BASE = "/api/v1/portfolio-site";
const json = { "Content-Type": "application/json" };

export type HandleCheck = { available: boolean; handle: string; message: string };
export type SiteResult = { data: PortfolioData; warnings: string[] };
export type SyncHandles = { github?: string; leetcode?: string; codechef?: string; codeforces?: string };

export const checkHandle = (handle: string) =>
  apiFetch<HandleCheck>(`${BASE}/check-handle?handle=${encodeURIComponent(handle)}`);

export const claimHandle = (handle: string, acceptedTerms: boolean) =>
  apiFetch<PortfolioData>(`${BASE}/claim-handle`, { method: "POST", headers: json, body: JSON.stringify({ handle, acceptedTerms }) });

export const getMyPortfolio = () => apiFetch<PortfolioData>(`${BASE}/me`);

export const saveMyPortfolio = (data: PortfolioData) =>
  apiFetch<PortfolioData>(`${BASE}/me`, { method: "PUT", headers: json, body: JSON.stringify(data) });

export const syncStats = (handles: SyncHandles) =>
  apiFetch<SiteResult>(`${BASE}/sync-stats`, { method: "POST", headers: json, body: JSON.stringify(handles), timeoutMs: 45000 });

export function uploadResume(file: File) {
  const form = new FormData();
  form.append("file", file);
  return apiFetch<SiteResult>(`${BASE}/upload-resume`, { method: "POST", body: form, timeoutMs: 90000 });
}

/** Public page data (no sign-in). Used by the browser; the server-rendered page fetches it directly. */
export const getPublicPortfolio = (handle: string) =>
  apiFetch<PortfolioData>(`${BASE}/public/${encodeURIComponent(handle)}`, { auth: false });
