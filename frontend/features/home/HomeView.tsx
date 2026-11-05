"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, FileText, Globe, GraduationCap } from "lucide-react";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/components/auth/AuthProvider";
import { Pip } from "@/components/mascot/Pip";
import { ErrorState } from "@/components/shared/ErrorState";
import { ModuleCard } from "@/components/shared/ModuleCard";
import { ProgressRing } from "@/components/shared/ProgressRing";
import { ApiError } from "@/lib/api/client";
import { describeError } from "@/lib/api/errors";
import { getHome } from "@/lib/api/home";
import type { HomeSummary } from "@/lib/api/home";
import { listSessions } from "@/lib/api/interview";
import { listPortfolios } from "@/lib/api/portfolio";
import { listVersions } from "@/lib/api/resume";
import { modules } from "@/features/home/content";
import { cn } from "@/lib/cn";

function statusFor(href: string, h: HomeSummary): string {
  const none = "Unavailable";
  switch (href) {
    case "/coding":
      return h.coding ? (h.coding.connected ? `${h.coding.connected} linked${h.coding.stale ? " · stale" : ""}` : "Not set up") : none;
    case "/resume":
      return h.resume ? (h.resume.approved ? `${h.resume.approved} approved${h.resume.stale_approved ? " · outdated" : ""}` : h.resume.drafts ? `${h.resume.drafts} draft(s)` : "Not set up") : none;
    case "/prep":
      return h.interview ? (h.interview.sessions ? `${h.interview.percent_done}% done` : "Not set up") : none;
    default:
      return h.portfolio ? (h.portfolio.approved ? `${h.portfolio.approved} approved${h.portfolio.stale_approved ? " · outdated" : ""}` : h.portfolio.portfolios ? "Draft" : "Not set up") : none;
  }
}

function greeting(): string {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

type Step = { id: string; title: string; detail: string; href: string; state: "done" | "todo" };

function journey(h: HomeSummary): Step[] {
  const profile = h.profile;
  const coding = h.coding;
  const resume = h.resume;
  const prep = h.interview;
  const pf = h.portfolio;
  return [
    {
      id: "profile", title: "Build your profile", href: "/profile",
      detail: profile ? `${profile.percent}% complete${profile.pending_proposals ? ` · ${profile.pending_proposals} suggestion(s) to review` : ""}` : "Unavailable right now",
      state: profile && profile.percent >= 70 ? "done" : "todo",
    },
    {
      id: "coding", title: "Link your coding profiles", href: "/coding",
      detail: coding ? (coding.connected ? `${coding.connected} platform(s) · ${coding.repositories} repositories` : "Connect GitHub or add your stats") : "Unavailable right now",
      state: coding && coding.connected > 0 ? "done" : "todo",
    },
    {
      id: "resume", title: "Approve a tailored resume", href: "/resume",
      detail: resume ? (resume.approved ? `${resume.approved} approved version(s)` : resume.drafts ? `${resume.drafts} draft(s) waiting for approval` : "Not started") : "Unavailable right now",
      state: resume && resume.approved > 0 ? "done" : "todo",
    },
    {
      id: "prep", title: "Practise for interviews", href: "/prep",
      detail: prep ? (prep.sessions ? `${prep.sessions} plan(s) · ${prep.percent_done}% of questions done` : "Not started") : "Unavailable right now",
      state: prep && prep.sessions > 0 && prep.percent_done >= 50 ? "done" : "todo",
    },
    {
      id: "portfolio", title: "Publish your portfolio", href: "/portfolio",
      detail: pf ? (pf.approved ? `${pf.approved} approved version(s)` : pf.portfolios ? "Draft in progress" : "Not started") : "Unavailable right now",
      state: pf && pf.approved > 0 ? "done" : "todo",
    },
  ];
}

export function HomeView() {
  const { user } = useAuth();
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

  const name = user?.email?.split("@")[0]?.replace(/[._-]+/g, " ") ?? "there";

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
          <Skeleton className="h-80 lg:col-span-7" />
          <Skeleton className="h-80 lg:col-span-5" />
        </div>
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const percent = home.profile?.percent ?? 0;
  const steps = journey(home);
  const currentIdx = steps.findIndex((s) => s.state === "todo");
  const doneCount = steps.filter((s) => s.state === "done").length;
  const top = home.next_actions[0];

  const stats = [
    { label: "Repositories", value: home.coding?.repositories, href: "/coding", color: "text-cobalt", bar: "bg-cobalt" },
    { label: "Resumes", value: home.resume ? home.resume.drafts + home.resume.approved : undefined, href: "/resume", color: "text-coral", bar: "bg-coral" },
    { label: "Prep plans", value: home.interview?.sessions, href: "/prep", color: "text-lavender", bar: "bg-lavender" },
    { label: "Portfolios", value: home.portfolio?.portfolios, href: "/portfolio", color: "text-mint", bar: "bg-mint" },
  ];

  return (
    <div className="space-y-14">
      {home.unavailable.length > 0 && (
        <p role="status" className="rounded-xl border-2 border-orange/50 bg-orange/10 p-3 text-sm font-medium">
          Some sections could not load ({home.unavailable.join(", ")}). The rest still work.
        </p>
      )}

      {/* ───────── Hero ───────── */}
      <section className="grid items-stretch gap-8 lg:grid-cols-12">
        <div className="animate-in flex flex-col justify-center lg:col-span-7">
          <p className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border-2 border-ink bg-surface px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em]">
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-orange" />
            {new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <h1 className="font-display text-[2.6rem] font-bold leading-[1.02] sm:text-6xl xl:text-7xl">
            {greeting()},<br />
            <span className="marker capitalize">{name}.</span>
          </h1>
          <p className="mt-6 max-w-lg text-base leading-relaxed text-muted sm:text-lg">
            {doneCount === steps.length
              ? "Every stage of your placement journey is in place. Keep your profile fresh and the rest stays in step."
              : `You have completed ${doneCount} of ${steps.length} stages. Everything here is built only from facts you approve.`}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            {top ? (
              <Link href={top.href} className={buttonClasses({ size: "md", className: "h-12 px-6 text-[15px]" })}>
                {top.title}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            ) : (
              <Link href="/profile" className={buttonClasses({ className: "h-12 px-6 text-[15px]" })}>Open your profile</Link>
            )}
            <Link href="/profile" className={buttonClasses({ variant: "secondary", className: "h-12 px-6 text-[15px]" })}>
              View profile
            </Link>
          </div>
        </div>

        {/* Habitat: Pip roams in here */}
        <div className="relative lg:col-span-5">
          <div className="relative min-h-[340px] overflow-hidden rounded-[2rem] border-2 border-ink bg-cobalt shadow-[6px_6px_0_var(--ink)] lg:h-full">
            <div aria-hidden="true" className="dotgrid absolute inset-0 text-white/15" />
            {/* sun */}
            <div aria-hidden="true" className="absolute right-8 top-8 h-20 w-20 rounded-full border-2 border-ink bg-orange" />
            {/* clouds */}
            <div aria-hidden="true" className="absolute left-8 top-14 h-7 w-24 rounded-full border-2 border-ink bg-white" />
            <div aria-hidden="true" className="absolute left-20 top-9 h-9 w-12 rounded-full border-2 border-ink bg-white" />
            <div aria-hidden="true" className="absolute right-32 top-32 h-6 w-16 rounded-full border-2 border-ink bg-white/90" />
            {/* ground */}
            <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-14 border-t-2 border-ink bg-mint" />
            <div aria-hidden="true" className="hatch absolute inset-x-0 bottom-0 h-14 text-ink/25" />
            {/* the mascot lives and wanders here */}
            <div className="pointer-events-none absolute bottom-7 right-[12%] w-[132px]">
              <Pip greeting="Hey!" />
            </div>
          </div>

          {/* profile strength sticker overlapping the corner */}
          <div className="sticker absolute -bottom-6 left-4 flex items-center gap-3 rounded-2xl p-3 sm:-left-6">
            <ProgressRing percent={percent} size={68} label="Profile completeness" color="var(--coral)" />
            <div className="pr-1">
              <p className="font-display text-base font-bold leading-tight">Profile strength</p>
              <p className="text-xs text-muted">{percent >= 100 ? "Complete" : percent >= 50 ? "Looking good" : "Getting started"}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── Stat band ───────── */}
      <section aria-label="Overview" className="animate-in panel grid grid-cols-2 overflow-hidden rounded-3xl lg:grid-cols-4">
        {stats.map((s, i) => (
          <Link
            key={s.label}
            href={s.href}
            className={cn(
              "group relative p-6 transition-colors hover:bg-surface-2",
              i % 2 === 1 && "border-l border-edge",
              i >= 2 && "border-t border-edge lg:border-t-0",
              i >= 1 && "lg:border-l",
            )}
          >
            <span aria-hidden="true" className={cn("absolute inset-x-0 top-0 h-1.5", s.bar)} />
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">{s.label}</p>
            <p className={cn("font-num mt-3 text-6xl font-bold leading-none tracking-tight", s.color)}>
              {s.value === undefined ? "–" : s.value}
            </p>
            <p className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-muted group-hover:text-ink">
              Open <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </p>
          </Link>
        ))}
      </section>

      {/* ───────── Journey + next actions ───────── */}
      <section className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <h2 className="font-display text-3xl font-bold">Your career journey</h2>
          <p className="mt-1 text-sm text-muted">Five stages from a blank profile to a published portfolio.</p>
          <ol className="relative mt-8 space-y-1">
            <span aria-hidden="true" className="absolute bottom-6 left-[19px] top-6 w-0.5 bg-edge" />
            {steps.map((s, i) => {
              const current = i === currentIdx;
              return (
                <li key={s.id}>
                  <Link href={s.href} className="group relative flex items-center gap-5 rounded-2xl p-3 transition-colors hover:bg-surface-2">
                    <span
                      className={cn(
                        "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-ink font-num text-sm font-bold",
                        s.state === "done" ? "bg-mint text-white" : current ? "bg-orange text-ink shadow-[3px_3px_0_var(--ink)]" : "bg-surface text-muted",
                      )}
                    >
                      {s.state === "done" ? <Check className="h-5 w-5" aria-hidden="true" /> : i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className={cn("font-display text-lg font-semibold", s.state === "todo" && !current && "text-muted")}>{s.title}</span>
                        {current && <span className="rounded-md bg-orange px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink">You are here</span>}
                      </span>
                      <span className="block text-sm text-muted">{s.detail}</span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100" aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ol>
        </div>

        <aside className="lg:col-span-5">
          <div className="sticker rounded-3xl bg-lavender/20 p-6">
            <h2 className="font-display text-2xl font-bold">Next best actions</h2>
            <p className="mt-1 text-sm text-ink/70">Picked from the current state of your work.</p>
            {home.next_actions.length === 0 ? (
              <p className="mt-6 flex items-center gap-2 text-sm font-medium">
                <Check className="h-4 w-4 text-ok" aria-hidden="true" /> You are up to date. Nothing needs attention.
              </p>
            ) : (
              <ol className="mt-5 space-y-3">
                {home.next_actions.map((a, index) => (
                  <li key={a.id}>
                    <Link href={a.href} className="group flex items-start gap-3 rounded-2xl border-2 border-ink bg-surface p-3.5 transition-transform hover:-translate-y-0.5 hover:shadow-[3px_3px_0_var(--ink)]">
                      <span aria-hidden="true" className="font-num flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-ink text-sm font-bold text-app">{index + 1}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold">{a.title}</span>
                        <span className="block text-xs leading-snug text-muted">{a.description}</span>
                      </span>
                      <ArrowRight className="mt-1 h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </aside>
      </section>

      {/* ───────── Modules (asymmetric bento) ───────── */}
      <section aria-labelledby="modules-heading">
        <h2 id="modules-heading" className="font-display mb-6 text-3xl font-bold">Jump back in</h2>
        <div className="grid gap-5 md:grid-cols-6">
          {modules.map((m, i) => (
            <ModuleCard
              key={m.href}
              index={i}
              href={m.href}
              title={m.title}
              description={m.description}
              icon={m.icon}
              statusLabel={statusFor(m.href, home)}
              className={i === 0 || i === 3 ? "md:col-span-4" : "md:col-span-2"}
            />
          ))}
        </div>
      </section>

      <RecentActivity />
    </div>
  );
}

type Activity = { id: string; icon: typeof FileText; text: string; href: string; at: string; tone: string };

/** Pulls the latest items from the existing list endpoints. Hidden when there is nothing yet. */
function RecentActivity() {
  const [items, setItems] = useState<Activity[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([listVersions(), listSessions(), listPortfolios()]).then(([v, s, p]) => {
      if (cancelled) return;
      const out: Activity[] = [];
      if (v.status === "fulfilled")
        v.value.forEach((x) => out.push({ id: `v${x.id}`, icon: FileText, text: `${x.title} (${x.status.toLowerCase()})`, href: "/resume", at: x.created_at, tone: "bg-coral" }));
      if (s.status === "fulfilled")
        s.value.forEach((x) => out.push({ id: `s${x.id}`, icon: GraduationCap, text: `Prep plan: ${x.company}, ${x.role}`, href: "/prep", at: x.created_at, tone: "bg-lavender" }));
      if (p.status === "fulfilled")
        p.value.forEach((x) => out.push({ id: `p${x.id}`, icon: Globe, text: `Portfolio: ${x.title}`, href: "/portfolio", at: x.versions[0]?.created_at ?? "", tone: "bg-mint" }));
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
      <h2 id="recent-heading" className="font-display mb-4 text-3xl font-bold">Recent activity</h2>
      <ul className="panel divide-y divide-edge overflow-hidden rounded-3xl">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <li key={it.id}>
              <Link href={it.href} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-surface-2">
                <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl border-2 border-ink text-white", it.tone)}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{it.text}</span>
                <time className="shrink-0 text-xs text-muted" dateTime={it.at}>{it.at ? new Date(it.at).toLocaleDateString() : ""}</time>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
