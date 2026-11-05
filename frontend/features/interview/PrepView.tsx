"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Check, Flag, Sparkles, Target, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import type { BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Skeleton } from "@/components/ui/Skeleton";
import { useFeedback } from "@/components/ui/Feedback";
import { EmptyState } from "@/components/shared/EmptyState";
import { ProgressRing } from "@/components/shared/ProgressRing";
import { describeError } from "@/lib/api/errors";
import * as api from "@/lib/api/interview";
import type { QState, Session, SessionQuestion, SessionSummary, Topic } from "@/lib/api/interview";
import { listJds } from "@/lib/api/resume";
import type { JobDescription } from "@/lib/api/resume";
import { ACCENT } from "@/lib/accent";
import type { Accent } from "@/lib/accent";
import { cn } from "@/lib/cn";

const TOPICS: Topic[] = ["DSA", "OOP", "DBMS", "OS", "CN", "HR", "PROJECT"];
const TOPIC_ACCENT: Record<Topic, Accent> = { DSA: "cobalt", OOP: "lavender", DBMS: "mint", OS: "orange", CN: "coral", HR: "ink", PROJECT: "lavender" };
const TOPIC_NAME: Record<Topic, string> = { DSA: "Data structures", OOP: "OOP", DBMS: "Databases", OS: "Operating systems", CN: "Networks", HR: "HR round", PROJECT: "Your projects" };
const LEVELS = ["Intern", "Fresher", "Junior", "Mid-level"];
const STATES: { value: QState; label: string }[] = [
  { value: "TODO", label: "To do" },
  { value: "DONE", label: "Done" },
  { value: "REVISIT", label: "Revisit" },
  { value: "SKIPPED", label: "Skip" },
];

function provenanceTone(type: string): BadgeTone {
  if (type === "AI_GENERATED") return "ai";
  if (type === "OFFICIAL") return "ok";
  if (type === "CANDIDATE_REPORTED" || type === "UNKNOWN") return "warn";
  return "data";
}

export function InterviewPrep() {
  const { toast, confirm } = useFeedback();
  const [sessions, setSessions] = useState<SessionSummary[] | null>(null);
  const [jds, setJds] = useState<JobDescription[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [days, setDays] = useState(14);

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
        duration_days: days,
        level: opt("level"),
        jd_id: opt("jd_id"),
      });
      setSession(created);
      await load();
      toast(`Your ${created.duration_days}-day plan for ${created.company} is ready.`);
      window.setTimeout(() => document.getElementById("sprint")?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    });
  }

  async function remove(s: SessionSummary) {
    const ok = await confirm({ title: "Delete this prep plan?", message: `Your plan for ${s.company} and all its progress will be permanently deleted.`, confirmLabel: "Delete", tone: "danger" });
    if (!ok) return;
    await guard(async () => {
      await api.deleteSession(s.id);
      if (session?.id === s.id) setSession(null);
      await load();
      toast("Plan deleted.");
    });
  }

  return (
    <div className="space-y-12">
      {/* Command center */}
      <section className="grid gap-6 lg:grid-cols-12">
        <form onSubmit={onCreate} className="sticker animate-in space-y-4 rounded-3xl bg-lavender/15 p-6 lg:col-span-5">
          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-lavender"><Target className="h-3.5 w-3.5" aria-hidden="true" /> New sprint</p>
            <h2 className="font-display text-2xl font-bold leading-tight">Plan your prep</h2>
            <p className="mt-1 text-sm text-ink/70">A deterministic plan from a curated question bank. The same inputs always give the same plan.</p>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="p-company" className="text-sm font-bold">Company</label>
            <input id="p-company" name="company" required maxLength={200} placeholder="e.g. Acme Corp" className="field" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="p-role" className="text-sm font-bold">Role</label>
            <input id="p-role" name="role" required maxLength={200} placeholder="e.g. Backend Engineer" className="field" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="p-level" className="text-sm font-bold">Level</label>
              <select id="p-level" name="level" className="field" defaultValue="Fresher">
                {LEVELS.map((l) => <option key={l}>{l}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="p-jd" className="text-sm font-bold">Job description</label>
              <select id="p-jd" name="jd_id" className="field" defaultValue="">
                <option value="">None (generic plan)</option>
                {jds.map((j) => <option key={j.id} value={j.id}>{[j.company, j.role_title].filter(Boolean).join(" · ") || "Untitled"}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <label htmlFor="p-days" className="text-sm font-bold">Days available</label>
              <span className="font-num text-3xl font-bold leading-none">{days}</span>
            </div>
            <input id="p-days" type="range" min={1} max={60} value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-full accent-[var(--lavender)]" />
            <div className="flex gap-1.5">
              {[3, 7, 14, 30].map((d) => (
                <button key={d} type="button" onClick={() => setDays(d)} aria-pressed={days === d}
                  className={cn("rounded-full border px-3 py-0.5 text-xs font-bold", days === d ? "border-edge-strong bg-ink text-app" : "border-edge-strong hover:border-edge-strong")}>
                  {d}d
                </button>
              ))}
            </div>
          </div>
          <Button type="submit" loading={busy} className="w-full">Build my plan</Button>
          {error && <p role="alert" className="text-sm font-medium text-coral">{error}</p>}
        </form>

        <div className="lg:col-span-7">
          <h2 className="font-display text-3xl font-bold">Your sprints</h2>
          <p className="mb-5 mt-1 text-sm text-muted">Pick one to continue where you left off.</p>
          {sessions === null ? (
            <div className="space-y-3"><Skeleton className="h-24" /><Skeleton className="h-24" /></div>
          ) : sessions.length === 0 ? (
            <EmptyState icon={Target} title="No sprints yet" description="Fill in the form to get a day-by-day plan with a source label on every question." />
          ) : (
            <ul className="space-y-3">
              {sessions.map((s, i) => {
                const active = session?.id === s.id;
                return (
                  <li key={s.id} style={{ animationDelay: `${i * 50}ms` }} className={cn("animate-in flex items-center gap-4 rounded-2xl border p-4 transition-all", active ? "border-edge-strong bg-lavender/20 shadow-pop" : "border-edge-strong bg-surface hover:border-edge-strong")}>
                    <span aria-hidden="true" className="font-display flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-edge-strong bg-lavender text-2xl font-bold text-on-accent">
                      {s.company.charAt(0).toUpperCase()}
                    </span>
                    <button type="button" onClick={() => open(s.id)} className="min-w-0 flex-1 text-left">
                      <span className="block truncate font-display text-xl font-semibold">{s.company}</span>
                      <span className="block truncate text-sm text-muted">{s.role} · {s.duration_days} days · created {new Date(s.created_at).toLocaleDateString()}</span>
                    </button>
                    <Button size="sm" variant={active ? "primary" : "secondary"} onClick={() => open(s.id)}>{active ? "Open" : "Continue"}</Button>
                    <button type="button" aria-label={`Delete plan for ${s.company}`} onClick={() => remove(s)} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-coral/15 hover:text-coral">
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <div id="sprint" className="scroll-mt-24">
        {session && <SessionView key={session.id} session={session} onUpdate={setSession} onError={setError} />}
      </div>
    </div>
  );
}

/* ───────── The open plan ───────── */
function SessionView({ session, onUpdate, onError }: { session: Session; onUpdate: (s: Session) => void; onError: (m: string | null) => void }) {
  const { toast } = useFeedback();
  const [busy, setBusy] = useState(false);
  const [topic, setTopic] = useState<Topic>("DSA");

  async function run(action: () => Promise<Session>, success?: string) {
    setBusy(true);
    onError(null);
    try {
      onUpdate(await action());
      if (success) toast(success);
    } catch (err) {
      onError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  const p = session.progress;
  const tiles = [
    { label: "Done", n: p.done, tone: "text-mint" },
    { label: "To do", n: p.todo, tone: "text-ink" },
    { label: "Revisit", n: p.revisit, tone: "text-orange" },
    { label: "Skipped", n: p.skipped, tone: "text-muted" },
  ];
  const firstOpen = session.days.findIndex((d) => d.questions.some((q) => q.state === "TODO" || q.state === "REVISIT"));

  return (
    <section aria-labelledby="sprint-title" className="space-y-8">
      {/* Header band */}
      <div className="relative overflow-hidden rounded-3xl border border-edge-strong bg-lavender/25 p-6 shadow-pop sm:p-8">
        <div aria-hidden="true" className="dotgrid absolute inset-0 text-ink/10" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center">
          <ProgressRing percent={p.percent_done} size={116} label="Plan progress" color="var(--lavender)" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-lavender">Active sprint · {session.duration_days} days</p>
            <h2 id="sprint-title" className="font-display text-3xl font-bold leading-tight sm:text-4xl">{session.company}</h2>
            <p className="text-sm text-ink/70">{session.role}</p>
            <p className="mt-2 text-xs text-ink/70">{session.note}</p>
          </div>
          <dl className="grid grid-cols-4 gap-2 md:gap-3">
            {tiles.map((t) => (
              <div key={t.label} className="rounded-xl border border-edge-strong bg-surface px-3 py-2 text-center">
                <dd className={cn("font-num text-3xl font-bold leading-none", t.tone)}>{t.n}</dd>
                <dt className="mt-1 text-[10px] font-bold uppercase tracking-wide text-muted">{t.label}</dt>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {session.gaps.length > 0 && (
        <section aria-label="Gaps" className="rounded-2xl border border-orange bg-orange/10 p-5">
          <h3 className="font-display text-xl font-semibold">Gaps from the job description</h3>
          <ul className="mt-2 space-y-1.5 text-sm">
            {session.gaps.map((g) => <li key={g.skill} className="flex gap-2"><Flag className="mt-0.5 h-4 w-4 shrink-0 text-orange" aria-hidden="true" />{g.advice}</li>)}
          </ul>
        </section>
      )}
      {!session.used_jd && <p className="text-sm text-muted">This is a generic role plan. Create a plan with a job description for gap-driven emphasis.</p>}
      {session.topics_without_questions.length > 0 && (
        <p role="status" className="text-sm font-medium text-warn">No curated questions yet for: {session.topics_without_questions.join(", ")}.</p>
      )}

      {/* Timeline */}
      <ol className="relative space-y-6 pl-1">
        <span aria-hidden="true" className="absolute bottom-4 left-[23px] top-4 w-0.5 bg-ink/15" />
        {session.days.map((d, di) => {
          const a = ACCENT[TOPIC_ACCENT[d.topic]];
          const total = d.questions.length;
          const done = d.questions.filter((q) => q.state === "DONE").length;
          const complete = total > 0 && done === total;
          const isNext = di === firstOpen;
          return (
            <li key={d.day} className="relative flex gap-4 sm:gap-6">
              <span className={cn("font-num relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-edge-strong text-lg font-bold", complete ? "bg-mint text-on-accent" : isNext ? "bg-orange text-on-accent shadow-pop" : "bg-surface")}>
                {complete ? <Check className="h-5 w-5" aria-hidden="true" /> : d.day}
              </span>
              <div className="panel min-w-0 flex-1 rounded-2xl p-5">
                <header className="flex flex-wrap items-center gap-3">
                  <span className={cn("rounded-md px-2 py-1 text-[11px] font-bold uppercase tracking-wide", a.bg, a.onSolid)}>{d.topic}</span>
                  <h3 className="font-display text-xl font-semibold">Day {d.day}: {TOPIC_NAME[d.topic]}</h3>
                  {isNext && <Badge tone="warn">Up next</Badge>}
                  <span className="ml-auto font-num text-sm font-bold text-muted">{done}/{total}</span>
                </header>
                {total > 0 && <ProgressBar className="mt-3" value={done} max={total} label={`Day ${d.day} progress`} accent={TOPIC_ACCENT[d.topic]} />}
                {total === 0 && <p className="mt-3 text-sm text-muted">No questions for this day yet. Add some below.</p>}
                <ul className="mt-4 space-y-3">
                  {d.questions.map((q) => (
                    <QuestionRow key={q.id} q={q} busy={busy} onSave={(state, notes) => run(() => api.saveProgress(session.id, q.id, { state, notes }))} onError={onError} />
                  ))}
                </ul>
              </div>
            </li>
          );
        })}
      </ol>

      {/* AI practice */}
      <Card accent="lavender" eyebrow="Extra practice" title="Need more questions?" description="These are written by an AI model, always labelled as such, and are never claimed to come from any company.">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <label htmlFor="gen-topic" className="text-sm font-bold">Topic</label>
            <select id="gen-topic" value={topic} onChange={(e) => setTopic(e.target.value as Topic)} className="field">
              {TOPICS.map((t) => <option key={t} value={t}>{TOPIC_NAME[t]}</option>)}
            </select>
          </div>
          <Button variant="secondary" loading={busy} onClick={() => run(() => api.generateQuestions(session.id, topic, 3), "Added AI-generated practice questions.")}>
            <Sparkles className="h-4 w-4" aria-hidden="true" /> Add 3 AI questions
          </Button>
        </div>
      </Card>
    </section>
  );
}

function Dots({ level }: { level: SessionQuestion["difficulty"] }) {
  const n = level === "EASY" ? 1 : level === "MEDIUM" ? 2 : 3;
  return (
    <span role="img" aria-label={`Difficulty: ${level.toLowerCase()}`} className="flex items-center gap-1" title={level.toLowerCase()}>
      {[1, 2, 3].map((i) => <span key={i} className={cn("h-2 w-2 rounded-full border border-edge-strong", i <= n ? "bg-ink" : "bg-transparent")} />)}
    </span>
  );
}

function QuestionRow({ q, busy, onSave, onError }: { q: SessionQuestion; busy: boolean; onSave: (s: QState, notes?: string | null) => void; onError: (m: string | null) => void }) {
  const { toast, prompt } = useFeedback();
  const [notes, setNotes] = useState(q.notes ?? "");

  async function report() {
    const reason = await prompt({ title: "Report this question", label: "What is wrong with it?", confirmLabel: "Send report", minLength: 5 });
    if (!reason) return;
    try {
      await api.reportQuestion(q.id, reason);
      onError(null);
      toast("Thanks, your report was recorded.");
    } catch (err) {
      onError(describeError(err));
    }
  }

  return (
    <li className={cn("rounded-xl border p-4 transition-colors", q.state === "DONE" ? "border-mint/50 bg-mint/8" : q.state === "SKIPPED" ? "border-edge-strong opacity-70" : "border-edge-strong")}>
      <p className={cn("text-[15px] font-medium leading-snug", q.state === "DONE" && "text-muted line-through decoration-mint decoration-2")}>{q.text}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge tone={provenanceTone(q.provenance_type)}>{q.provenance_label}</Badge>
        <Dots level={q.difficulty} />
        <div role="group" aria-label="Progress" className="ml-auto flex overflow-hidden rounded-lg border border-edge-strong">
          {STATES.map((s) => (
            <button key={s.value} type="button" disabled={busy} aria-pressed={q.state === s.value} onClick={() => onSave(s.value, notes || null)}
              className={cn("border-r border-edge-strong px-2.5 py-1 text-xs font-bold last:border-r-0 disabled:opacity-60", q.state === s.value ? (s.value === "DONE" ? "bg-mint text-on-accent" : s.value === "REVISIT" ? "bg-orange text-on-accent" : "bg-ink text-app") : "bg-surface text-muted hover:bg-surface-2 hover:text-ink")}>
              {s.label}
            </button>
          ))}
        </div>
      </div>
      {q.sources[0]?.reliability_note && <p className="mt-2 text-xs text-muted">{q.sources[0].reliability_note}</p>}
      <div className="mt-3 flex gap-2">
        <label className="sr-only" htmlFor={`n-${q.id}`}>Notes</label>
        <input id={`n-${q.id}`} value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => notes !== (q.notes ?? "") && onSave(q.state, notes || null)} maxLength={1000} placeholder="Your notes (saved when you click away)" className="field" />
        <button type="button" onClick={report} className="shrink-0 text-xs font-semibold text-muted hover:text-coral hover:underline">Report</button>
      </div>
    </li>
  );
}
