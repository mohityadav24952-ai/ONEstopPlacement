"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Sparkles, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import type { BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { describeError } from "@/lib/api/errors";
import * as api from "@/lib/api/interview";
import type { QState, Session, SessionQuestion, SessionSummary, Topic } from "@/lib/api/interview";
import { listJds } from "@/lib/api/resume";
import type { JobDescription } from "@/lib/api/resume";

const inputClass = "w-full rounded-md border border-edge bg-app px-3 py-2 text-sm text-fg";
const TOPICS: Topic[] = ["DSA", "OOP", "DBMS", "OS", "CN", "HR", "PROJECT"];
const STATES: { value: QState; label: string }[] = [
  { value: "TODO", label: "To do" },
  { value: "DONE", label: "Done" },
  { value: "REVISIT", label: "Revisit" },
  { value: "SKIPPED", label: "Skipped" },
];

function provenanceTone(type: string): BadgeTone {
  if (type === "AI_GENERATED") return "ai";
  if (type === "OFFICIAL") return "ok";
  if (type === "CANDIDATE_REPORTED" || type === "UNKNOWN") return "warn";
  return "data";
}

export function InterviewPrep() {
  const [sessions, setSessions] = useState<SessionSummary[] | null>(null);
  const [jds, setJds] = useState<JobDescription[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, j] = await Promise.all([api.listSessions(), listJds()]);
      setSessions(s);
      setJds(j);
    } catch (err) {
      setError(describeError(err));
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function guard(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  const open = (id: string) => guard(async () => setSession(await api.getSession(id)));

  function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const opt = (k: string) => String(data.get(k) ?? "").trim() || undefined;
    return guard(async () => {
      const created = await api.createSession({
        company: String(data.get("company")).trim(),
        role: String(data.get("role")).trim(),
        duration_days: Number(data.get("duration_days")),
        level: opt("level"),
        jd_id: opt("jd_id"),
      });
      setSession(created);
      await load();
    });
  }

  return (
    <div className="space-y-6">
      <Card title="New preparation plan" description="Built by code from a curated question bank, your projects and (optionally) a job description. The same inputs always give the same plan.">
        <form onSubmit={onCreate} className="grid gap-3 sm:grid-cols-2">
          <Field id="p-company" label="Company"><input id="p-company" name="company" required maxLength={200} className={inputClass} /></Field>
          <Field id="p-role" label="Role"><input id="p-role" name="role" required maxLength={200} className={inputClass} /></Field>
          <Field id="p-days" label="Days available (1-60)"><input id="p-days" name="duration_days" type="number" min={1} max={60} defaultValue={14} required className={inputClass} /></Field>
          <Field id="p-level" label="Level (optional)"><input id="p-level" name="level" maxLength={50} placeholder="Intern, fresher…" className={inputClass} /></Field>
          <div className="sm:col-span-2">
            <Field id="p-jd" label="Job description (optional)">
              <select id="p-jd" name="jd_id" className={inputClass} defaultValue="">
                <option value="">None — generic role plan</option>
                {jds.map((j) => <option key={j.id} value={j.id}>{[j.company, j.role_title].filter(Boolean).join(" · ") || "Untitled job description"}</option>)}
              </select>
            </Field>
          </div>
          <div className="sm:col-span-2"><Button type="submit" loading={busy}>Create plan</Button></div>
        </form>
        {error && <p role="alert" className="mt-3 text-sm text-err">{error}</p>}
      </Card>

      <Card title="Your plans">
        {sessions === null ? <Skeleton className="h-16 w-full" /> : sessions.length === 0 ? (
          <EmptyState title="No plans yet" description="Create one above to get a day-by-day question plan." />
        ) : (
          <ul className="space-y-2">
            {sessions.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2 rounded-md border border-edge p-3">
                <button type="button" className="min-w-0 flex-1 text-left text-sm" onClick={() => open(s.id)}>
                  <span className="font-medium">{s.company} · {s.role}</span>
                  <span className="ml-2 text-muted">{s.duration_days} days</span>
                </button>
                <button type="button" aria-label={`Delete plan for ${s.company}`} className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-edge/40 hover:text-err"
                  onClick={() => window.confirm("Delete this plan and its progress?") && guard(async () => { await api.deleteSession(s.id); if (session?.id === s.id) setSession(null); await load(); })}>
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {session && <SessionView key={session.id} session={session} onUpdate={setSession} onError={setError} />}
    </div>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}

function SessionView({ session, onUpdate, onError }: { session: Session; onUpdate: (s: Session) => void; onError: (m: string | null) => void }) {
  const [busy, setBusy] = useState(false);
  const [topic, setTopic] = useState<Topic>("DSA");

  async function run(action: () => Promise<Session>) {
    setBusy(true);
    onError(null);
    try {
      onUpdate(await action());
    } catch (err) {
      onError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  const p = session.progress;
  return (
    <Card title={`${session.company} · ${session.role}`} description={session.note}>
      <div className="mb-4">
        <div role="progressbar" aria-label="Plan progress" aria-valuenow={p.percent_done} aria-valuemin={0} aria-valuemax={100} className="h-2 overflow-hidden rounded-full bg-edge/60">
          <div className="h-full bg-ok" style={{ width: `${p.percent_done}%` }} />
        </div>
        <p className="mt-1 text-sm text-muted">{p.done} of {p.total} done · {p.revisit} to revisit · {p.skipped} skipped</p>
      </div>

      {session.gaps.length > 0 && (
        <section aria-label="Gaps" className="mb-4 space-y-1 rounded-md border border-warn/40 p-3 text-sm">
          <h3 className="font-display font-semibold">Gaps from the job description</h3>
          {session.gaps.map((g) => <p key={g.skill}>{g.advice}</p>)}
        </section>
      )}
      {!session.used_jd && <p className="mb-4 text-sm text-muted">This is a generic role plan. Add a job description for gap-driven emphasis.</p>}
      {session.topics_without_questions.length > 0 && (
        <p role="status" className="mb-4 text-sm text-warn">No curated questions yet for: {session.topics_without_questions.join(", ")}.</p>
      )}

      <div className="space-y-6">
        {session.days.map((d) => (
          <section key={d.day} aria-label={`Day ${d.day}`}>
            <h3 className="font-display font-semibold">Day {d.day} · {d.topic}</h3>
            <ul className="mt-2 space-y-2">
              {d.questions.map((q) => <QuestionRow key={q.id} q={q} busy={busy} onSave={(state, notes) => run(() => api.saveProgress(session.id, q.id, { state, notes }))} onError={onError} />)}
            </ul>
          </section>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-2 border-t border-edge pt-4">
        <div className="space-y-1.5">
          <label htmlFor="gen-topic" className="text-sm font-medium">More practice on</label>
          <select id="gen-topic" value={topic} onChange={(e) => setTopic(e.target.value as Topic)} className={inputClass}>
            {TOPICS.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <Button variant="secondary" loading={busy} onClick={() => run(() => api.generateQuestions(session.id, topic, 3))}>
          <Sparkles className="h-4 w-4" aria-hidden="true" /> Add 3 AI-generated questions
        </Button>
      </div>
    </Card>
  );
}

function QuestionRow({ q, busy, onSave, onError }: { q: SessionQuestion; busy: boolean; onSave: (s: QState, notes?: string | null) => void; onError: (m: string | null) => void }) {
  const [notes, setNotes] = useState(q.notes ?? "");

  async function report() {
    const reason = window.prompt("What is wrong with this question?");
    if (!reason) return;
    try {
      await api.reportQuestion(q.id, reason);
      onError(null);
      window.alert("Thanks, your report was recorded.");
    } catch (err) {
      onError(describeError(err));
    }
  }

  return (
    <li className="rounded-md border border-edge p-3">
      <p className="text-sm">{q.text}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Badge tone={provenanceTone(q.provenance_type)}>{q.provenance_label}</Badge>
        <Badge tone="neutral">{q.difficulty.toLowerCase()}</Badge>
        <div role="group" aria-label="Progress" className="ml-auto flex gap-1">
          {STATES.map((s) => (
            <button key={s.value} type="button" disabled={busy} aria-pressed={q.state === s.value} onClick={() => onSave(s.value, notes || null)}
              className={`rounded-md border px-2 py-1 text-xs ${q.state === s.value ? "border-primary bg-primary/15 text-primary" : "border-edge text-muted hover:bg-edge/40"}`}>
              {s.label}
            </button>
          ))}
        </div>
      </div>
      {q.sources[0]?.reliability_note && <p className="mt-1 text-xs text-muted">{q.sources[0].reliability_note}</p>}
      <div className="mt-2 flex gap-2">
        <label className="sr-only" htmlFor={`n-${q.id}`}>Notes</label>
        <input id={`n-${q.id}`} value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => notes !== (q.notes ?? "") && onSave(q.state, notes || null)} maxLength={1000} placeholder="Your notes" className={inputClass} />
        <button type="button" onClick={report} className="shrink-0 text-xs text-muted hover:text-err hover:underline">Report</button>
      </div>
    </li>
  );
}
