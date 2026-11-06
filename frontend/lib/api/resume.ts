import { apiFetch } from "@/lib/api/client";

const json = { "Content-Type": "application/json" };
const post = (path: string, body?: unknown, timeoutMs = 60000) =>
  apiFetch<never>(path, {
    method: "POST",
    headers: json,
    body: body === undefined ? undefined : JSON.stringify(body),
    timeoutMs,
  });

/** A hyperlink read from the optional .tex upload. It reaches a resume only once the user allows it. */
export type LatexLink = { text: string; url: string; status: "pending" | "approved" | "rejected" };

export type ResumeDoc = {
  id: string;
  original_name: string;
  size: number;
  page_count: number | null;
  parse_status: "UPLOADED" | "PARSED" | "FAILED";
  latex_links?: LatexLink[];
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

/** Approval-gate state. "locked" = matches the job description, always included. Missing = approved (older drafts). */
export type ReviewState = "locked" | "pending" | "approved" | "rejected";
type Reviewed = { review?: ReviewState; jd?: string[] };
export type Bullet = Reviewed & { id: string; text: string; user_edited?: boolean; ai_assisted?: boolean };
export type ResumeContent = {
  header: { name: string | null; headline: string | null; location: string | null; email: string | null };
  summary: Reviewed & { text: string | null; source?: "ai" | "template"; ai_generated?: boolean; user_edited?: boolean };
  education: (Reviewed & { id: string; institution: string; degree: string | null; field: string | null; grade?: string | null; start_date?: string | null; end_date?: string | null })[];
  experience: (Reviewed & { id: string; title: string; organization: string; bullets: Bullet[] })[];
  projects: (Reviewed & { id: string; title: string; tech: string[]; bullets: Bullet[] })[];
  skills: string[];
  /** Per skill: its Skills sub-heading and review state. */
  skill_meta?: Record<string, Reviewed & { category?: string }>;
  achievements: (Reviewed & { id: string; title: string; issuer: string | null; kind?: "coding" | "leadership" | "certification" })[];
  links?: (Reviewed & { text: string; url: string })[];
};
/** One line of the approval checklist. */
export type ReviewItem = {
  id: string;
  section: string;
  label: string;
  text: string;
  review: ReviewState;
  jd: string[];
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
  /** Items still waiting for Approve / Reject in the checklist. */
  pending_review?: number;
  created_at: string;
};
export type Version = VersionSummary & {
  content: ResumeContent;
  change_list: ChangeProposal[];
  claim_flags: ClaimFlag[];
  review_items?: ReviewItem[];
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
/** Optional: the .tex source of the same resume, read only for its hyperlinks (href commands). */
export const uploadLatex = (id: string, file: File) => {
  const form = new FormData();
  form.append("file", file);
  return apiFetch<ResumeDoc>(`/api/v1/resume/documents/${id}/latex`, { method: "POST", body: form, timeoutMs: 30000 });
};
export const decideLatexLinks = (id: string, decisions: Record<string, "approved" | "rejected">) =>
  post(`/api/v1/resume/documents/${id}/latex/decisions`, { decisions }) as Promise<ResumeDoc>;

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
/** The approval checklist: approve or reject items (only approved and JD-locked items reach the final PDF). */
export const reviewItems = (id: string, decisions: Record<string, "approved" | "rejected">) =>
  post(`/api/v1/resume/versions/${id}/review`, { decisions }) as Promise<Version>;
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
/** The preview PDF AND its one-page fit report, from ONE request (the fit travels in the X-Resume-Fit header). */
export const previewTemplate = async (id: string, template: TemplateId, documentId?: string | null, signal?: AbortSignal) => {
  let fit: FitReport | null = null;
  const blob = await apiFetch<Blob>(
    `/api/v1/resume/templates/versions/${id}/preview?template_id=${template}${documentId ? `&document_id=${documentId}` : ""}`,
    {
      responseType: "blob", timeoutMs: 30000, cache: "no-store", signal,
      onHeaders: (h) => {
        try {
          const raw = h.get("X-Resume-Fit");
          fit = raw ? (JSON.parse(raw) as FitReport) : null;
        } catch {
          fit = null; // the fit note is optional; the preview never depends on it
        }
      },
    },
  );
  return { blob, fit: fit as FitReport | null };
};
/** How a version fits on one page: the size scale used and anything left out of the PDF (never from the saved resume). */
export type FitReport = { pages: number; scale: number; trimmed: string[] };
export const getFit = (id: string, template: TemplateId, documentId?: string | null) =>
  apiFetch<FitReport>(
    `/api/v1/resume/templates/versions/${id}/fit?template_id=${template}${documentId ? `&document_id=${documentId}` : ""}`,
    { timeoutMs: 30000, cache: "no-store" },
  );
export const regenerateSummary = (id: string) => post(`/api/v1/resume/versions/${id}/summary`) as Promise<Version>;
export const exportTemplate = (id: string, template_id: TemplateId, document_id?: string | null) =>
  apiFetch<VersionSummary & { fit?: FitReport }>(`/api/v1/resume/templates/versions/${id}/export`, {
    method: "POST",
    headers: json,
    body: JSON.stringify({ template_id, document_id: document_id ?? undefined }),
    timeoutMs: 30000,
  });
export const editFields = (
  id: string,
  body: { name?: string; headline?: string; email?: string; location?: string; skills?: string[] },
) => apiFetch<Version>(`/api/v1/resume/templates/versions/${id}/fields`, { method: "PATCH", headers: json, body: JSON.stringify(body) });
