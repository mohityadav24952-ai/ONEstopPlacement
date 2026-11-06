"use client";

import { useEffect, useId, useRef, useState } from "react";
import { BookOpen, Check, ChevronDown, ExternalLink, Loader2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import type { BadgeTone } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";
import { useFeedback } from "@/components/ui/Feedback";
import { PlaceyCharacter } from "@/components/placey/PlaceyCharacter";
import { PlatformIcon } from "@/components/shared/PlatformIcon";
import type { PlatformKey } from "@/components/shared/PlatformIcon";
import { describeError } from "@/lib/api/errors";
import * as api from "@/lib/api/interview";
import type { AskPlaceyReply, QState, SessionQuestion } from "@/lib/api/interview";
import { cn } from "@/lib/cn";

const CORE = new Set(["OS", "DBMS", "CN", "OOP"]);

function provenanceTone(type: string): BadgeTone {
  if (type === "AI_GENERATED") return "ai";
  if (type === "OFFICIAL") return "ok";
  if (type === "CANDIDATE_REPORTED" || type === "UNKNOWN") return "warn";
  return "data";
}

function Dots({ level }: { level: SessionQuestion["difficulty"] }) {
  const n = level === "EASY" ? 1 : level === "MEDIUM" ? 2 : 3;
  return (
    <span role="img" aria-label={`Difficulty: ${level.toLowerCase()}`} className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-muted">
      {[1, 2, 3].map((i) => <span key={i} className={cn("h-2 w-2 rounded-full border border-edge-strong", i <= n ? "bg-ink" : "bg-transparent")} />)}
      <span className="ml-1">{level.toLowerCase()}</span>
    </span>
  );
}

/** A visible (and legacy-safe) check: DSA items without an external link are old plain-text ones and are not shown. */
export function isShown(q: SessionQuestion): boolean {
  return q.topic !== "DSA" || (q.format === "link" && !!q.sources[0]?.url);
}

/* ───────── the single Done chip ───────── */
function DoneChip({ done, busy, onToggle, label }: { done: boolean; busy: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={done}
      aria-label={`${label}: ${done ? "done, click to undo" : "mark as done"}`}
      disabled={busy}
      onClick={onToggle}
      className={cn(
        "group inline-flex h-9 shrink-0 items-center gap-2 rounded-full border-2 pl-1.5 pr-3.5 text-sm font-bold transition-all duration-200 disabled:opacity-60",
        done
          ? "border-ok bg-ok/15 text-ok shadow-[0_0_0_4px_color-mix(in_srgb,var(--ok)_14%,transparent)]"
          : "border-edge-strong text-muted hover:border-ok hover:bg-ok/8 hover:text-fg",
      )}
    >
      <span
        aria-hidden="true"
        className={cn("flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all duration-200", done ? "border-ok bg-ok text-on-accent" : "border-edge-strong group-hover:border-ok")}
      >
        {done && (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
            <path className="tick-draw" d="M5 12.5l4.5 4.5L19 7" />
          </svg>
        )}
      </span>
      {done ? "Done" : "Mark done"}
    </button>
  );
}

const BITS = Array.from({ length: 16 }, (_, i) => {
  const a = (i / 16) * Math.PI * 2;
  const r = 40 + ((i * 17) % 38);
  return { x: Math.cos(a) * r, y: Math.sin(a) * r * 0.7 - 6, rot: (i * 53) % 360, color: ["var(--ok)", "var(--primary)", "var(--orange)", "var(--coral)", "var(--lavender)"][i % 5], delay: (i % 4) * 30 };
});

/** A tiny confetti pop inside one card, plus a glow, the moment it turns Done. Not on first render. */
function useDoneFeedback(done: boolean) {
  const prev = useRef(done);
  const [burst, setBurst] = useState(0);
  const [glow, setGlow] = useState(false);
  useEffect(() => {
    if (done && !prev.current) {
      setBurst((b) => b + 1);
      setGlow(true);
      const t = window.setTimeout(() => setGlow(false), 1600);
      prev.current = done;
      return () => window.clearTimeout(t);
    }
    prev.current = done;
  }, [done]);
  return { burst, glow };
}

function Confetti({ burstKey }: { burstKey: number }) {
  if (!burstKey) return null;
  return (
    <span key={burstKey} aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
      <span className="absolute bottom-3 right-14 h-0 w-0">
        {BITS.map((b, i) => (
          <span
            key={i}
            className="confetti-bit absolute h-2 w-1.5 rounded-[1px]"
            style={{ background: b.color, "--x": `${b.x}px`, "--y": `${b.y}px`, "--r": `${b.rot}deg`, animationDelay: `${b.delay}ms` } as React.CSSProperties}
          />
        ))}
      </span>
    </span>
  );
}

const cardClass = (done: boolean, glow: boolean) =>
  cn(
    "relative rounded-xl border p-4 transition-colors duration-300",
    done ? "border-ok/60 bg-ok/8" : "border-edge-strong",
    glow && "done-glow",
  );

function platformOf(url: string): PlatformKey | "HYNTS" {
  const host = new URL(url).hostname;
  if (host === "hynts.in") return "HYNTS";
  if (host.includes("leetcode")) return "LEETCODE";
  if (host.includes("naukri")) return "CODE360";
  return "GEEKSFORGEEKS";
}

type RowProps = {
  q: SessionQuestion;
  sessionId: string;
  busy: boolean;
  onSave: (s: QState, notes?: string | null) => void;
  onError: (m: string | null) => void;
};

/** Hynts has no brand icon in the icon set, so it gets a plain tile of the same size and shape. */
function SourceLogo({ platform }: { platform: PlatformKey | "HYNTS" }) {
  if (platform !== "HYNTS") return <PlatformIcon platform={platform} size={46} />;
  return (
    <span role="img" aria-label="Hynts" className="inline-flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-xl border border-black/10 bg-white text-lg font-black text-[#6d28d9] shadow-card">
      H
    </span>
  );
}

/* ───────── DSA: a rich card that links out. No problem text, ever. ───────── */
export function DsaLinkCard({ q, busy, onSave }: RowProps) {
  const done = q.state === "DONE";
  const { burst, glow } = useDoneFeedback(done);
  const src = q.sources[0];
  const host = new URL(src.url!).hostname.replace(/^www\./, "");
  return (
    <li className={cardClass(done, glow)}>
      <Confetti burstKey={burst} />
      <div className="flex flex-wrap items-center gap-4">
        <SourceLogo platform={platformOf(src.url!)} />
        <div className="min-w-0 flex-1 basis-56">
          <p className={cn("text-[15px] font-semibold leading-snug", done && "text-muted")}>{q.text}</p>
          {src.reliability_note && <p className="mt-0.5 text-xs leading-snug text-muted">{src.reliability_note}</p>}
          <p className="mt-1 text-[11px] text-muted/80">{host}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a href={src.url!} target="_blank" rel="noopener noreferrer" className={buttonClasses({ size: "md" })}>
            {src.title} <ExternalLink className="h-4 w-4" aria-label="(opens in a new tab)" />
          </a>
          <DoneChip done={done} busy={busy} label={q.text} onToggle={() => onSave(done ? "TODO" : "DONE", q.notes)} />
        </div>
      </div>
    </li>
  );
}

/* ───────── everything else: a written question ───────── */
export function TextQuestionCard({ q, sessionId, busy, onSave, onError }: RowProps) {
  const { toast, prompt } = useFeedback();
  const [notes, setNotes] = useState(q.notes ?? "");
  const done = q.state === "DONE";
  const { burst, glow } = useDoneFeedback(done);

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
    <li className={cardClass(done, glow)}>
      <Confetti burstKey={burst} />
      <p className={cn("text-[15px] font-medium leading-snug", done && "text-muted line-through decoration-ok decoration-2")}>{q.text}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge tone={provenanceTone(q.provenance_type)}>{q.provenance_label}</Badge>
        <Dots level={q.difficulty} />
        {(q.state === "REVISIT" || q.state === "SKIPPED") && <Badge tone="neutral">Marked {q.state.toLowerCase()} earlier</Badge>}
        <div className="ml-auto">
          <DoneChip done={done} busy={busy} label={q.text} onToggle={() => onSave(done ? "TODO" : "DONE", notes || null)} />
        </div>
      </div>
      {CORE.has(q.topic) && q.answer?.length ? (
        // Dual buttons: the saved answer first (instant, no API call), Placey as the optional deeper dive.
        <div className="mt-3 flex flex-wrap items-start gap-2">
          <ViewAnswer q={q} />
          <AskPlacey sessionId={sessionId} q={q} secondary />
        </div>
      ) : (CORE.has(q.topic) || q.topic === "HR") && <AskPlacey sessionId={sessionId} q={q} />}
      {q.sources[0]?.reliability_note && <p className="mt-2 text-xs text-muted">{q.sources[0].reliability_note}</p>}
      <div className="mt-3 flex gap-2">
        <label className="sr-only" htmlFor={`n-${q.id}`}>Notes</label>
        <input id={`n-${q.id}`} value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => notes !== (q.notes ?? "") && onSave(q.state, notes || null)} maxLength={1000} placeholder="Your notes (saved when you click away)" className="field" />
        <button type="button" onClick={report} className="shrink-0 text-xs font-semibold text-muted hover:text-coral hover:underline">Report</button>
      </div>
    </li>
  );
}

export function QuestionItem(props: RowProps) {
  return props.q.format === "link" && props.q.sources[0]?.url ? <DsaLinkCard {...props} /> : <TextQuestionCard {...props} />;
}

/* ───────── View Answer: the locally saved answer, zero API calls ───────── */
function ViewAnswer({ q }: { q: SessionQuestion }) {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className={cn(
          "inline-flex items-center gap-2 rounded-full border border-primary/50 bg-primary/10 px-3.5 py-1.5 text-sm font-bold text-fg transition-all hover:border-primary hover:bg-primary/15",
          open && "border-primary bg-primary/15",
        )}
      >
        <BookOpen className="h-4 w-4 text-primary" aria-hidden="true" />
        {open ? "Hide answer" : "View Answer"}
        <ChevronDown className={cn("h-4 w-4 text-muted transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>
      {open && (
        <div id={panelId} className="animate-in mt-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm">
          <ul className="space-y-1.5">
            {q.answer!.map((line, i) => (
              <li key={i} className="flex gap-2 leading-snug">
                <span aria-hidden="true" className="font-num mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-primary/15 text-[11px] font-bold">{i + 1}</span>
                {line}
              </li>
            ))}
          </ul>
          <p className="mt-3 border-t border-edge pt-2 text-xs text-muted">Saved answer, shown instantly. Want more depth or have a follow-up? Use Ask Placey.</p>
        </div>
      )}
    </div>
  );
}

/* ───────── ✨ Ask Placey ───────── */
const STAR = [
  { key: "situation", letter: "S", name: "Situation", tone: "bg-primary/15 text-primary" },
  { key: "task", letter: "T", name: "Task", tone: "bg-orange/15 text-orange" },
  { key: "action", letter: "A", name: "Action", tone: "bg-coral/15 text-coral" },
  { key: "result", letter: "R", name: "Result", tone: "bg-ok/15 text-ok" },
] as const;

function AskPlacey({ sessionId, q, secondary = false }: { sessionId: string; q: SessionQuestion; secondary?: boolean }) {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reply, setReply] = useState<AskPlaceyReply | null>(null);
  const [error, setError] = useState<string | null>(null);
  const behavioural = q.topic === "HR";

  async function ask() {
    if (reply) {
      setOpen((o) => !o);
      return;
    }
    setOpen(true);
    setLoading(true);
    setError(null);
    try {
      setReply(await api.askPlacey(sessionId, q.id));
    } catch (err) {
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={secondary ? "w-full" : "mt-3"}>
      <button
        type="button"
        onClick={ask}
        aria-expanded={open}
        aria-controls={panelId}
        className={cn(
          "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-bold transition-all hover:border-lavender hover:bg-lavender/20 hover:shadow-card",
          secondary ? "border-edge-strong bg-transparent text-muted hover:text-fg" : "border-lavender/50 bg-lavender/12 text-fg",
          open && "border-lavender bg-lavender/20 text-fg",
        )}
      >
        <Sparkles className="h-4 w-4 text-lavender" aria-hidden="true" />
        {secondary ? "Ask Placey (deeper explanation)" : "Ask Placey"}
        <ChevronDown className={cn("h-4 w-4 text-muted transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>

      {open && (
        <div id={panelId} className="animate-in mt-3 rounded-2xl border border-lavender/40 bg-gradient-to-br from-lavender/10 to-transparent p-4">
          <div className="flex items-start gap-3">
            <PlaceyCharacter mode={behavioural ? "classic" : "study"} animated={false} className="h-12 w-12 shrink-0" />
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-bold">{behavioural ? "Placey's guide (no ready-made answer, it's your story!)" : "Placey's short answer"}</p>

              {loading && (
                <p role="status" className="mt-2 flex items-center gap-2 text-muted">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Thinking...
                </p>
              )}
              {error && <p role="alert" className="mt-2 font-medium text-coral">{error}</p>}

              {reply?.kind === "answer" && (
                <ol className="mt-2 space-y-1.5">
                  {reply.lines.map((l, i) => (
                    <li key={i} className="flex gap-2 leading-snug">
                      <span aria-hidden="true" className="font-num mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-lavender/20 text-[11px] font-bold">{i + 1}</span>
                      {l}
                    </li>
                  ))}
                </ol>
              )}

              {reply?.kind === "guidance" && (
                <div className="mt-2 space-y-4">
                  <ul className="space-y-1.5">
                    {reply.hints.map((h, i) => (
                      <li key={i} className="flex gap-2 leading-snug"><Check className="mt-0.5 h-4 w-4 shrink-0 text-lavender" aria-hidden="true" />{h}</li>
                    ))}
                  </ul>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-muted">Key values to show</p>
                    <ul className="mt-1.5 flex flex-wrap gap-1.5">
                      {reply.values.map((v) => <li key={v} className="rounded-full border border-lavender/50 bg-surface px-2.5 py-0.5 text-xs font-bold">{v}</li>)}
                    </ul>
                    <p className="mt-1.5 text-xs text-muted">{reply.values_note}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-muted">How to frame it</p>
                    <ul className="mt-1.5 space-y-1.5">
                      {reply.framing_tips.map((t, i) => (
                        <li key={i} className="flex gap-2 leading-snug"><Check className="mt-0.5 h-4 w-4 shrink-0 text-lavender" aria-hidden="true" />{t}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-muted">Build your answer with STAR</p>
                    <ul className="mt-1.5 grid gap-2 sm:grid-cols-2">
                      {STAR.map((s) => (
                        <li key={s.key} className="flex gap-2 rounded-xl border border-edge bg-surface p-2.5">
                          <span aria-hidden="true" className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm font-extrabold", s.tone)}>{s.letter}</span>
                          <span className="text-xs leading-snug"><span className="block font-bold">{s.name}</span>{reply.star[s.key]}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {reply && (
                <div className="mt-3 space-y-1.5 border-t border-edge pt-2.5 text-xs text-muted">
                  {reply.mock && <p className="font-semibold text-warn">Demo mode: no Gemini key is set, so this is a placeholder. Add GEMINI_API_KEY to backend/.env for real answers.</p>}
                  {reply.cached && <p className="font-semibold text-ok">Saved answer, shown instantly.</p>}
                  <p>{reply.disclaimer}</p>
                  {reply.sources.length > 0 && (
                    <div>
                      <p className="font-bold text-fg">Sources consulted</p>
                      <ul className="mt-1 space-y-0.5">
                        {reply.sources.map((s) => (
                          <li key={s.url} className="truncate">
                            <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-1 text-primary hover:underline">
                              <span className="truncate">{s.title}</span> <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <a href={reply.read_more.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-bold text-primary hover:underline">
                    {reply.read_more.title} <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
