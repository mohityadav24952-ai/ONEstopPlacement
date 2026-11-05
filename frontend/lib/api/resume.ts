import { apiFetch } from "@/lib/api/client";

const json = { "Content-Type": "application/json" };
const post = (path: string, body?: unknown, timeoutMs = 60000) =>
  apiFetch<never>(path, {
    method: "POST",
    headers: json,
    body: body === undefined ? undefined : JSON.stringify(body),
    timeoutMs,
  });

export type ResumeDoc = {
  id: string;
  original_name: string;
  size: number;
  page_count: number | null;
  parse_status: "UPLOADED" | "PARSED" | "FAILED";
};

export type ParsedItem = {
  fields: Record<string, unknown>;
  source_span: string;
  confidence: "low" | "medium" | "high";
};
export type Parsed = Record<string, ParsedItem[]> & {
  dropped_count: number;
  needs_manual_entry: boolean;
};

export type JobDescription = {
  id: string;
  company: string | null;
  role_title: string | null;
  text?: string;
};

export type Requirement = {
  id: string;
  text: string;
  category: string;
  importance: "must" | "nice";
  jd_quote: string;
};
export type Analysis = {
  id: string;
  jd_id: string;
  requirements: Requirement[];
  matches: { requirement_id: string; status: "matched" | "partial" | "missing"; evidence_ids: string[] }[];
  jd_quality: "ok" | "low";
  stale: boolean;
};

export type Bullet = { id: string; text: string; user_edited?: boolean; ai_assisted?: boolean };
export type ResumeContent = {
  header: { name: string | null; headline: string | null; location: string | null; email: string | null };
  summary: { text: string | null };
  education: { id: string; institution: string; degree: string | null; field: string | null }[];
  experience: { id: string; title: string; organization: string; bullets: Bullet[] }[];
  projects: { id: string; title: string; tech: string[]; bullets: Bullet[] }[];
  skills: string[];
  achievements: { id: string; title: string; issuer: string | null }[];
};
export type ChangeProposal = {
  id: string;
  target: string;
  before: string;
  after: string;
  rationale: string;
  status: "pending" | "accepted" | "rejected";
};
export type ClaimFlag = {
  id: string;
  requirement: string | null;
  question: string;
  resolved: boolean;
  resolution: string | null;
};
export type VersionSummary = {
  id: string;
  title: string;
  status: "DRAFT" | "APPROVED";
  stale: boolean;
  has_pdf: boolean;
  template_id?: string | null;
  unresolved_flags: number;
  pending_proposals: number;
  created_at: string;
};
export type Version = VersionSummary & {
  content: ResumeContent;
  change_list: ChangeProposal[];
  claim_flags: ClaimFlag[];
  notes?: string[];
};

// ---- documents
export const listDocuments = () => apiFetch<ResumeDoc[]>("/api/v1/resume/documents", { cache: "no-store" });
export const uploadDocument = (file: File) => {
  const form = new FormData();
  form.append("file", file);
  return apiFetch<ResumeDoc>("/api/v1/resume/documents", { method: "POST", body: form, timeoutMs: 30000 });
};
export const parseDocument = (id: string) =>
  post(`/api/v1/resume/documents/${id}/parse`) as Promise<ResumeDoc & { parsed: Parsed }>;
export const getParsed = (id: string) =>
  apiFetch<ResumeDoc & { parsed: Parsed }>(`/api/v1/resume/documents/${id}/parsed`);
export const importItems = (id: string, items: Record<string, Record<string, unknown>[]>) =>
  post(`/api/v1/resume/documents/${id}/import`, { items }) as Promise<{ proposals_created: number; skipped_duplicates: number }>;
export const deleteDocument = (id: string) => apiFetch<void>(`/api/v1/resume/documents/${id}`, { method: "DELETE" });

// ---- job descriptions and analysis
export const listJds = () => apiFetch<JobDescription[]>("/api/v1/job-descriptions", { cache: "no-store" });
export const createJd = (body: { text: string; company?: string; role_title?: string }) =>
  post("/api/v1/job-descriptions", body) as Promise<JobDescription>;
export const deleteJd = (id: string) => apiFetch<void>(`/api/v1/job-descriptions/${id}`, { method: "DELETE" });
export const analyse = (jd_id: string) => post("/api/v1/resume/analyses", { jd_id }) as Promise<Analysis>;

// ---- versions
export const listVersions = () => apiFetch<VersionSummary[]>("/api/v1/resume/versions", { cache: "no-store" });
export const getVersion = (id: string) => apiFetch<Version>(`/api/v1/resume/versions/${id}`, { cache: "no-store" });
export const createVersion = (analysis_id?: string) =>
  post("/api/v1/resume/versions", analysis_id ? { analysis_id } : {}) as Promise<Version>;
export const editVersion = (id: string, body: { title?: string; summary?: string; bullet_edits?: Record<string, string>; remove_ids?: string[] }) =>
  apiFetch<Version>(`/api/v1/resume/versions/${id}`, { method: "PATCH", headers: json, body: JSON.stringify(body) });
export const decideProposal = (id: string, pid: string, d: "accept" | "reject") =>
  post(`/api/v1/resume/versions/${id}/proposals/${pid}/${d}`) as Promise<Version>;
export const resolveFlag = (id: string, flag: string, resolution: "dismiss" | "recheck") =>
  post(`/api/v1/resume/versions/${id}/flags/${flag}/resolve`, { resolution }) as Promise<Version>;
export const approveVersion = (id: string) => post(`/api/v1/resume/versions/${id}/approve`) as Promise<Version>;
export const renderPdf = (id: string) => post(`/api/v1/resume/versions/${id}/pdf`);
export const downloadPdf = (id: string) =>
  apiFetch<Blob>(`/api/v1/resume/versions/${id}/pdf`, { responseType: "blob", timeoutMs: 30000 });
export const deleteVersion = (id: string) => apiFetch<void>(`/api/v1/resume/versions/${id}`, { method: "DELETE" });

// ---- templates (four looks, one set of content)
export type TemplateId = "classic" | "intern" | "modern" | "clone";
export type TemplateInfo = {
  id: TemplateId;
  number: number;
  name: string;
  description: string;
  available: boolean;
  reason: string | null;
  /** Template 4 only: what it was matched to. */
  note?: string;
  source_name?: string | null;
  matched?: string[];
  document_id?: string | null;
};
export const listTemplates = () => apiFetch<TemplateInfo[]>("/api/v1/resume/templates", { cache: "no-store" });
export const previewTemplate = (id: string, template: TemplateId, documentId?: string | null) =>
  apiFetch<Blob>(
    `/api/v1/resume/templates/versions/${id}/preview?template_id=${template}${documentId ? `&document_id=${documentId}` : ""}`,
    { responseType: "blob", timeoutMs: 30000, cache: "no-store" },
  );
export const exportTemplate = (id: string, template_id: TemplateId, document_id?: string | null) =>
  apiFetch<VersionSummary>(`/api/v1/resume/templates/versions/${id}/export`, {
    method: "POST",
    headers: json,
    body: JSON.stringify({ template_id, document_id: document_id ?? undefined }),
    timeoutMs: 30000,
  });
export const editFields = (
  id: string,
  body: { name?: string; headline?: string; email?: string; location?: string; skills?: string[] },
) => apiFetch<Version>(`/api/v1/resume/templates/versions/${id}/fields`, { method: "PATCH", headers: json, body: JSON.stringify(body) });
