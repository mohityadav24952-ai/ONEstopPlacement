import { apiFetch } from "@/lib/api/client";

const json = { "Content-Type": "application/json" };

export type Topic = "DSA" | "OOP" | "DBMS" | "OS" | "CN" | "HR" | "PROJECT";
export type QState = "TODO" | "DONE" | "REVISIT" | "SKIPPED";

export type SessionQuestion = {
  id: string;
  text: string;
  topic: Topic;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  provenance_type: string;
  provenance_label: string;
  sources: { url: string | null; title: string | null; reliability_note: string | null; license_note: string | null }[];
  state: QState;
  notes: string | null;
  /** "link": a card that opens an external platform (all DSA items). "text": a written question. */
  format: "link" | "text";
  /** The master-list wording, when `text` has been lightly re-phrased for this plan. */
  original_text?: string;
  /** Core subjects: the locally saved answer ("View Answer"), shown with no API call. */
  answer?: string[];
};

export type Session = {
  id: string;
  company: string;
  role: string;
  duration_days: number;
  used_jd: boolean;
  /** `description`: what to do on that day (DSA days carry the practice directive). */
  days: { day: number; topic: Topic; description?: string | null; questions: SessionQuestion[] }[];
  gaps: { skill: string; topic: string | null; advice: string }[];
  topics_without_questions: string[];
  /** Requested days the plan did not need (topics ran out of questions; no empty days are shown). */
  free_days?: number;
  /** How DSA days beyond the planned link cards were filled (Hynts sheet, or the curated fallback list). */
  dsa_backfill?: { source: "hynts" | "fallback" | null; days: number[]; company_on_hynts: boolean } | null;
  progress: { total: number; todo: number; done: number; revisit: number; skipped: number; percent_done: number };
  note: string;
};

export type SessionSummary = { id: string; company: string; role: string; duration_days: number; created_at: string };

export const listSessions = () => apiFetch<SessionSummary[]>("/api/v1/interview/sessions", { cache: "no-store" });
export const getSession = (id: string) => apiFetch<Session>(`/api/v1/interview/sessions/${id}`, { cache: "no-store" });
export const createSession = (body: { company: string; role: string; duration_days: number; level?: string; stage?: string; jd_id?: string }) =>
  apiFetch<Session>("/api/v1/interview/sessions", { method: "POST", headers: json, body: JSON.stringify(body), timeoutMs: 20000 });
export const deleteSession = (id: string) => apiFetch<void>(`/api/v1/interview/sessions/${id}`, { method: "DELETE" });
export const saveProgress = (id: string, qid: string, body: { state: QState; notes?: string | null }) =>
  apiFetch<Session>(`/api/v1/interview/sessions/${id}/questions/${qid}`, { method: "PUT", headers: json, body: JSON.stringify(body) });
export const generateQuestions = (id: string, topic: Topic, count: number) =>
  apiFetch<Session>(`/api/v1/interview/sessions/${id}/generate`, { method: "POST", headers: json, body: JSON.stringify({ topic, count }), timeoutMs: 60000 });
export const reportQuestion = (qid: string, reason: string) =>
  apiFetch<{ reported: boolean }>(`/api/v1/interview/questions/${qid}/report`, { method: "POST", headers: json, body: JSON.stringify({ reason }) });

export type ResourceLink = {
  id: string;
  title: string;
  description: string;
  url: string;
  source: "GEEKSFORGEEKS" | "LEETCODE";
  kind: "interview_experiences" | "topic_guide" | "practice" | "discussion" | "search";
  scope: "company" | "topic";
};

export type Resources = {
  company: string | null;
  topic: Topic | null;
  company_resources: ResourceLink[];
  topic_resources: ResourceLink[];
  note: string;
};

export const getResources = (params: { company?: string; topic?: Topic; subtopic?: string }) => {
  const q = new URLSearchParams();
  if (params.company) q.set("company", params.company);
  if (params.topic) q.set("topic", params.topic);
  if (params.subtopic) q.set("subtopic", params.subtopic);
  return apiFetch<Resources>(`/api/v1/interview/resources?${q.toString()}`);
};

type AskBase = {
  question: string;
  topic: Topic;
  /** True when no AI key is configured, so the content is a placeholder. */
  mock: boolean;
  read_more: { title: string; url: string };
  disclaimer: string;
  /** True when web search results backed the reply. */
  grounded: boolean;
  /** Pages the web search returned (what was consulted, not necessarily every claim). */
  sources: { title: string; url: string }[];
  /** True when this exact question was already answered and the saved answer was returned instantly. */
  cached: boolean;
  model: string;
};

export type AskPlaceyReply =
  | (AskBase & { kind: "answer"; lines: string[] })
  | (AskBase & {
      kind: "guidance";
      hints: string[];
      values: string[];
      values_note: string;
      framing_tips: string[];
      star: { situation: string; task: string; action: string; result: string };
    });

export const askPlacey = (sessionId: string, questionId: string) =>
  apiFetch<AskPlaceyReply>(`/api/v1/interview/sessions/${sessionId}/questions/${questionId}/ask-placey`, { method: "POST", timeoutMs: 60000 });
