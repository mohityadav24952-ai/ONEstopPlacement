"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  CheckCircle2,
  Code2,
  Flag,
  FileText,
  Flame,
  Globe,
  GraduationCap,
  Target,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/components/auth/AuthProvider";
import { ErrorState } from "@/components/shared/ErrorState";
import { ProgressRing } from "@/components/shared/ProgressRing";
import { ApiError } from "@/lib/api/client";
import { describeError } from "@/lib/api/errors";
import { getHome } from "@/lib/api/home";
import type { HomeSummary } from "@/lib/api/home";
import { listSessions } from "@/lib/api/interview";
import { listPortfolios } from "@/lib/api/portfolio";
import { listVersions } from "@/lib/api/resume";
import { PlatformIconRow } from "@/components/shared/PlatformIcon";
import { CountUpText } from "@/components/effects/CountUp";
import { useStreak } from "@/lib/streak";
import { cn } from "@/lib/cn";

function greeting(): string {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

type Step = { id: string; title: string; detail: string; href: string; done: boolean };

/** The five stages of the placement journey, computed only from real summary data. */
function journey(h: HomeSummary): Step[] {
  const { profile, coding, resume, interview: prep, portfolio: pf } = h;
  return [
    {
      id: "profile", title: "Build your profile", href: "/profile",
      detail: profile ? `${profile.percent}% complete${profile.pending_proposals ? ` · ${profile.pending_proposals} suggestion(s) to review` : ""}` : "Unavailable right now",
      done: !!profile && profile.percent >= 70,
    },
    {
      id: "coding", title: "Link your coding profiles", href: "/coding",
      detail: coding ? (coding.connected ? `${coding.connected} platform(s) · ${coding.repositories} repositories` : "Connect GitHub or add your stats") : "Unavailable right now",
      done: !!coding && coding.connected > 0,
    },
    {
      id: "resume", title: "Approve a tailored resume", href: "/resume",
      detail: resume ? (resume.approved ? `${resume.approved} approved version(s)` : resume.drafts ? `${resume.drafts} draft(s) waiting for approval` : "Not started") : "Unavailable right now",
      done: !!resume && resume.approved > 0,
    },
    {
      id: "prep", title: "Practise for interviews", href: "/prep",
      detail: prep ? (prep.sessions ? `${prep.sessions} plan(s) · ${prep.percent_done}% of questions done` : "Not started") : "Unavailable right now",
      done: !!prep && prep.sessions > 0 && prep.percent_done >= 50,
    },
    {
      id: "portfolio", title: "Publish your portfolio", href: "/portfolio",
      detail: pf ? (pf.approved ? `${pf.approved} approved version(s)` : pf.portfolios ? "Draft in progress" : "Not started") : "Unavailable right now",
      done: !!pf && pf.approved > 0,
    },
  ];
}

/** Decorative landscape. Colours come from the active theme's tokens. */
function Landscape() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 640 260"
      preserveAspectRatio="xMaxYMax slice"
      className="pointer-events-none absolute inset-y-0 right-0 h-full w-full opacity-95 sm:w-[78%]"
    >
      <defs>
        <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--hero-sun)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="var(--hero-sun)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="470" cy="120" r="110" fill="url(#sunGlow)" />
      <circle cx="470" cy="120" r="34" fill="var(--hero-sun)" opacity="0.9" />
      <path d="M0 200 L90 120 L150 165 L250 70 L350 160 L430 105 L540 175 L640 120 L640 260 L0 260Z" fill="var(--hero-far)" />
      <path d="M0 235 L110 175 L190 215 L300 150 L400 220 L500 180 L640 230 L640 260 L0 260Z" fill="var(--hero-near)" />
    </svg>
  );
}

function StatCard({
  icon: Icon, label, value, note, percent, href, tone,
}: {
  icon: LucideIcon; label: string; value: string; note?: string; percent?: number; href?: string; tone: string;
}) {
  const body = (
    <>
      <div className="flex items-center gap-3">
        <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", tone)}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted">{label}</p>
          <p className="font-num truncate text-2xl font-bold leading-tight"><CountUpText value={value} /></p>
        </div>
      </div>
      {percent !== undefined ? (
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-edge-strong/50" role="progressbar" aria-label={label} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
          <div className="fx-bar h-full rounded-full bg-primary transition-[width] duration-700" style={{ width: `${percent}%` }} />
        </div>
      ) : (
        <p className="mt-4 text-xs text-muted">{note}</p>
      )}
    </>
  );
  const cls = "panel hover-lift animate-in block rounded-2xl p-5";
  return href ? <Link href={href} className={cls}>{body}</Link> : <div className={cls}>{body}</div>;
}

export function HomeDashboard() {
  const { user } = useAuth();
  const streak = useStreak();
  const [home, setHome] = useState<HomeSummary | null>(null);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async () => {
    try {
      setHome(await getHome());
      setError(null);
    } catch (err) {
      setError(err);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const rawName = user?.email?.split("@")[0]?.replace(/[._-]+/g, " ") ?? "there";
  const name = rawName.split(" ")[0].replace(/^./, (c) => c.toUpperCase());

  if (error) {
    return (
      <ErrorState
        title="Could not load your overview"
        message={describeError(error)}
        referenceId={error instanceof ApiError ? error.requestId : undefined}
        action={<Button onClick={() => { setError(null); void load(); }}>Try again</Button>}
      />
    );
  }

  if (!home) {
    return (
      <div role="status" className="space-y-6">
        <span className="sr-only">Loading your overview</span>
        <div className="grid gap-6 lg:grid-cols-12">
          <Skeleton className="h-64 lg:col-span-8" />
          <Skeleton className="h-64 lg:col-span-4" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const percent = home.profile?.percent ?? 0;
  const steps = journey(home);
  const doneCount = steps.filter((s) => s.done).length;
  const overall = Math.round((doneCount / steps.length) * 100);
  const nextStep = steps.find((s) => !s.done);
  const top = home.next_actions[0];

  const quick: { href: string; icon: LucideIcon; title: string; sub: string }[] = [
    { href: "/coding", icon: Code2, title: "Continue Coding", sub: home.coding?.connected ? `${home.coding.repositories} repositories synced` : "Connect your platforms" },
    { href: "/resume", icon: FileText, title: "Build Resume", sub: home.resume ? `${home.resume.drafts} draft(s), ${home.resume.approved} approved` : "Unavailable" },
    { href: "/prep", icon: GraduationCap, title: "Plan Interview", sub: home.interview?.sessions ? `${home.interview.sessions} plan(s) · ${home.interview.percent_done}% done` : "Create your first plan" },
    { href: "/portfolio", icon: Globe, title: "View Portfolio", sub: home.portfolio ? `${home.portfolio.portfolios} portfolio(s)` : "Unavailable" },
  ];

  return (
    <div className="space-y-8">
      {home.unavailable.length > 0 && (
        <p role="status" className="rounded-xl border border-warn/40 bg-warn/10 p-3 text-sm font-medium">
          Some sections could not load ({home.unavailable.join(", ")}). The rest still work.
        </p>
      )}

      {/* ───────── Hero + overall progress ───────── */}
      <section className="grid gap-6 lg:grid-cols-12">
        <div className="hero-surface animate-in relative overflow-hidden rounded-3xl border border-edge-strong p-7 shadow-card sm:p-9 lg:col-span-8">
          <Landscape />
          <div className="relative max-w-md">
            <p className="text-sm font-medium text-muted">
              {new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <h1 className="mt-3 text-4xl font-bold leading-[1.1] sm:text-5xl">
              {greeting()},
              <br />
              <span className="text-primary">{name}!</span>
            </h1>
            <p className="mt-4 text-base text-muted">
              {doneCount === steps.length
                ? "Every stage of your journey is in place. Keep your profile fresh."
                : `${doneCount} of ${steps.length} stages done. Keep going, one stage at a time.`}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={top?.href ?? nextStep?.href ?? "/profile"}
                className="fx-btn fx-glow inline-flex h-11 items-center gap-2 rounded-[0.65rem] bg-primary px-5 text-sm font-semibold text-on-primary shadow-card transition-all hover:brightness-110 hover:shadow-pop"
              >
                {top?.title ?? nextStep?.title ?? "Open your profile"}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>

        <div className="panel fx-border animate-in relative rounded-3xl p-6 lg:col-span-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Your progress</h2>
            <Link href="/profile" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
              View all <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
          <div className="mt-5 flex items-center gap-5">
            <ProgressRing percent={overall} size={104} label="Overall journey progress" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Overall progress</p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-edge-strong/50">
                <div className="fx-bar h-full rounded-full bg-primary transition-[width] duration-700" style={{ width: `${overall}%` }} />
              </div>
              <p className="mt-2 text-xs text-muted">{doneCount} of {steps.length} journey stages complete</p>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── Stats ───────── */}
      <section aria-label="Overview" className="fx-stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Award} label="Profile strength" value={home.profile ? `${percent}%` : "Unavailable"} percent={home.profile ? percent : undefined} note="Profile unavailable" href="/profile" tone="bg-orange/15 text-orange" />
        <StatCard icon={CheckCircle2} label="Completed tasks" value={`${doneCount} / ${steps.length}`} percent={overall} href="/profile" tone="bg-ok/15 text-ok" />
        <StatCard
          icon={Flame}
          label="Study streak"
          value={streak.current > 0 ? `🔥 ${streak.current} day${streak.current === 1 ? "" : "s"}` : "Start today"}
          note={
            streak.current === 0
              ? "Do one study action today, or spend 10 active minutes here, to start your streak."
              : streak.atRisk
                ? `Do something today to keep it going. Best: ${streak.longest} day${streak.longest === 1 ? "" : "s"}.`
                : `Active today ✓ Best: ${streak.longest} day${streak.longest === 1 ? "" : "s"}.`
          }
          tone="bg-coral/15 text-coral"
        />
        <StatCard icon={Target} label="Placement goal" value={doneCount === steps.length ? "Ready" : "In progress"} note={nextStep ? `Next: ${nextStep.title}` : "All stages complete"} href={nextStep?.href ?? "/profile"} tone="bg-primary/15 text-primary" />
      </section>

      {/* ───────── Quick actions + next step ───────── */}
      <section className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
            <Zap className="h-5 w-5 text-primary" aria-hidden="true" /> Quick actions
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {quick.map((q, i) => {
              const Icon = q.icon;
              return (
                <Link key={q.href} href={q.href} style={{ animationDelay: `${i * 60}ms` }} className="panel hover-lift animate-in group flex items-center gap-4 rounded-2xl p-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{q.title}</span>
                    <span className="block truncate text-xs text-muted">{q.sub}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted transition-transform group-hover:translate-x-1 group-hover:text-primary" aria-hidden="true" />
                </Link>
              );
            })}
          </div>
        </div>

        <div className="hero-surface fx-border animate-in relative rounded-3xl border border-edge-strong p-6 shadow-card lg:col-span-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-primary">
            <Flag className="h-4 w-4" aria-hidden="true" /> Next milestone
          </p>
          {nextStep ? (
            <>
              <h2 className="mt-3 text-xl font-bold leading-snug">{nextStep.title}</h2>
              <p className="mt-1 text-sm text-muted">{nextStep.detail}</p>
              <Link href={nextStep.href} className="fx-btn fx-glow mt-5 inline-flex h-10 items-center gap-2 rounded-[0.65rem] bg-primary px-4 text-sm font-semibold text-on-primary shadow-card transition-all hover:brightness-110">
                Continue <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </>
          ) : (
            <>
              <h2 className="mt-3 text-xl font-bold leading-snug">All stages complete</h2>
              <p className="mt-1 text-sm text-muted">Keep your profile and resume up to date as you grow.</p>
            </>
          )}
        </div>
      </section>

      {/* ───────── Journey + next actions ───────── */}
      <section className="grid gap-6 lg:grid-cols-12">
        <div className="panel animate-in rounded-3xl p-6 lg:col-span-7">
          <h2 className="text-lg font-bold">Your career journey</h2>
          <p className="mt-0.5 text-sm text-muted">Five stages from a blank profile to a published portfolio.</p>
          <ol className="mt-5 space-y-1">
            {steps.map((s, i) => {
              const current = s === nextStep;
              return (
                <li key={s.id}>
                  <Link href={s.href} className="group flex items-center gap-4 rounded-xl p-2.5 transition-colors hover:bg-surface-2">
                    <span className={cn("font-num flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold", s.done ? "bg-ok/20 text-ok" : current ? "bg-primary text-on-primary" : "bg-surface-2 text-muted")}>
                      {s.done ? <CheckCircle2 className="h-5 w-5" aria-hidden="true" /> : i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn("flex items-center gap-2 text-sm font-semibold", !s.done && !current && "text-muted")}>{s.title}{s.id === "coding" && <PlatformIconRow size={20} />}</span>
                      <span className="block truncate text-xs text-muted">{s.detail}</span>
                    </span>
                    {current && <span className="rounded-md bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">Up next</span>}
                  </Link>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="panel animate-in rounded-3xl p-6 lg:col-span-5">
          <h2 className="text-lg font-bold">Suggested next actions</h2>
          <p className="mt-0.5 text-sm text-muted">Picked from the current state of your work.</p>
          {home.next_actions.length === 0 ? (
            <p className="mt-5 flex items-center gap-2 text-sm font-medium">
              <CheckCircle2 className="h-4 w-4 text-ok" aria-hidden="true" /> You are up to date. Nothing needs attention.
            </p>
          ) : (
            <ol className="mt-4 space-y-2.5">
              {home.next_actions.map((a, index) => (
                <li key={a.id}>
                  <Link href={a.href} className="group flex items-start gap-3 rounded-xl border border-edge p-3.5 transition-colors hover:border-primary/50 hover:bg-primary/5">
                    <span aria-hidden="true" className="font-num flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/15 text-xs font-bold text-primary">{index + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">{a.title}</span>
                      <span className="block text-xs leading-snug text-muted">{a.description}</span>
                    </span>
                    <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-muted transition-transform group-hover:translate-x-1 group-hover:text-primary" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>

      <RecentActivity />
    </div>
  );
}

type Activity = { id: string; icon: LucideIcon; text: string; kind: string; href: string; at: string };

/** The latest items from the existing list endpoints. Hidden when there is nothing yet. */
function RecentActivity() {
  const [items, setItems] = useState<Activity[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([listVersions(), listSessions(), listPortfolios()]).then(([v, s, p]) => {
      if (cancelled) return;
      const out: Activity[] = [];
      if (v.status === "fulfilled")
        v.value.forEach((x) => out.push({ id: `v${x.id}`, icon: FileText, kind: "Resume", text: `${x.title} (${x.status.toLowerCase()})`, href: "/resume", at: x.created_at }));
      if (s.status === "fulfilled")
        s.value.forEach((x) => out.push({ id: `s${x.id}`, icon: GraduationCap, kind: "Prep", text: `${x.company}, ${x.role}`, href: "/prep", at: x.created_at }));
      if (p.status === "fulfilled")
        p.value.forEach((x) => out.push({ id: `p${x.id}`, icon: Globe, kind: "Portfolio", text: x.title, href: "/portfolio", at: x.versions[0]?.created_at ?? "" }));
      out.sort((a, b) => b.at.localeCompare(a.at));
      setItems(out.slice(0, 5));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!items || items.length === 0) return null;
  return (
    <section aria-labelledby="recent-heading">
      <h2 id="recent-heading" className="mb-3 text-lg font-bold">Recently accessed</h2>
      <ul className="panel divide-y divide-edge overflow-hidden rounded-2xl">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <li key={it.id}>
              <Link href={it.href} className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-surface-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{it.text}</span>
                  <span className="block text-xs text-muted">{it.kind}</span>
                </span>
                <time className="shrink-0 text-xs text-muted" dateTime={it.at}>{it.at ? new Date(it.at).toLocaleDateString() : ""}</time>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
