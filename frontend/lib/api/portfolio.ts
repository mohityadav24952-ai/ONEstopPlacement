import { apiFetch } from "@/lib/api/client";

const json = { "Content-Type": "application/json" };
const send = <T,>(method: string, path: string, body?: unknown, timeoutMs = 60000) =>
  apiFetch<T>(path, { method, headers: json, body: body === undefined ? undefined : JSON.stringify(body), timeoutMs });

export type Theme = { id: string; name: string; description: string; options: { accent: string[] } };

export type PContent = {
  sections: string[];
  hero: { name: string; headline: string };
  about: { text: string };
  projects: { id: string; title: string; blurb: string; tech: string[]; links: string[] }[];
  skills_groups: { group: string; skills: string[] }[];
  education: { institution: string; degree: string }[];
  achievements: { title: string }[];
  contact: { email: string | null; include_email: boolean; location: string | null; include_location: boolean };
};

export type Report = {
  ok: boolean;
  errors: { where: string; message: string }[];
  warnings: { where: string; message: string }[];
};

export type PVersion = {
  id: string;
  portfolio_id: string;
  status: "DRAFT" | "APPROVED";
  theme_id: string;
  theme_options: { accent?: string };
  content: PContent;
  validation_report: Report | null;
  stale: boolean;
  has_export: boolean;
};

export type PortfolioSummary = {
  id: string;
  title: string;
  slug: string;
  versions: { id: string; status: string; theme_id: string; stale: boolean; created_at: string }[];
};

export type ConsentSummary = { items: string[]; summary_hash: string; statement: string };

export const listThemes = () => apiFetch<Theme[]>("/api/v1/portfolio/themes");
export const listPortfolios = () => apiFetch<PortfolioSummary[]>("/api/v1/portfolio", { cache: "no-store" });
export const createPortfolio = (body: { title: string; theme_id: string; sections: string[] }) =>
  send<{ portfolio_id: string; version: PVersion; notes: string[] }>("POST", "/api/v1/portfolio", body);
export const newDraft = (portfolioId: string, body: { title: string; theme_id: string; sections: string[] }) =>
  send<{ version: PVersion; notes: string[] }>("POST", `/api/v1/portfolio/${portfolioId}/versions`, body);
export const deletePortfolio = (id: string) => apiFetch<void>(`/api/v1/portfolio/${id}`, { method: "DELETE" });
export const getVersion = (id: string) => apiFetch<PVersion>(`/api/v1/portfolio/versions/${id}`, { cache: "no-store" });
export const editVersion = (id: string, body: Record<string, unknown>) => send<PVersion>("PATCH", `/api/v1/portfolio/versions/${id}`, body, 15000);
export const getPreview = (id: string) =>
  apiFetch<Blob>(`/api/v1/portfolio/versions/${id}/preview`, { responseType: "blob" }).then((b) => b.text());
export const validateVersion = (id: string) => send<Report>("POST", `/api/v1/portfolio/versions/${id}/validate`);
export const consentSummary = (id: string) => apiFetch<ConsentSummary>(`/api/v1/portfolio/versions/${id}/consent-summary`, { cache: "no-store" });
export const approveVersion = (id: string, consent_summary_hash: string) =>
  send<PVersion>("POST", `/api/v1/portfolio/versions/${id}/approve`, { consent_summary_hash });
export const exportVersion = (id: string) => send<PVersion>("POST", `/api/v1/portfolio/versions/${id}/export`);
export const downloadExport = (id: string) =>
  apiFetch<Blob>(`/api/v1/portfolio/versions/${id}/export`, { responseType: "blob", timeoutMs: 30000 });
