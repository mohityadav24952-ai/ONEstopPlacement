"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Rocket } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/components/auth/AuthProvider";
import { ErrorState } from "@/components/shared/ErrorState";
import { ModuleCard } from "@/components/shared/ModuleCard";
import { ProgressRing } from "@/components/shared/ProgressRing";
import { ApiError } from "@/lib/api/client";
import { describeError } from "@/lib/api/errors";
import { getHome } from "@/lib/api/home";
import type { HomeSummary } from "@/lib/api/home";
import { modules } from "@/features/home/content";

function statusFor(href: string, h: HomeSummary): string {
  const none = "Unavailable";
  switch (href) {
    case "/coding":
      return h.coding ? (h.coding.connected ? `${h.coding.connected} connected${h.coding.stale ? " · stale" : ""}` : "Not set up") : none;
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

  const name = user?.email?.split("@")[0] ?? "there";

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
        <Skeleton className="h-52 w-full" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-44" />
          <Skeleton className="h-44" />
        </div>
      </div>
    );
  }

  const percent = home.profile?.percent ?? 0;
  const stats = [
    { label: "Repositories", value: home.coding?.repositories },
    { label: "Resumes", value: home.resume ? home.resume.drafts + home.resume.approved : undefined },
    { label: "Prep plans", value: home.interview?.sessions },
    { label: "Portfolios", value: home.portfolio?.portfolios },
  ];

  return (
    <div className="space-y-10">
      {home.unavailable.length > 0 && (
        <p role="status" className="rounded-xl border border-warn/40 bg-warn/10 p-3 text-sm">
          Some sections could not load ({home.unavailable.join(", ")}). The rest still work.
        </p>
      )}

      {/* Hero */}
      <section className="animate-in relative overflow-hidden rounded-3xl border border-edge p-6 shadow-[var(--shadow-card)] sm:p-9">
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-br from-primary/25 via-surface to-data/20" />
        <div aria-hidden="true" className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-primary/30 blur-3xl" />
        <div aria-hidden="true" className="absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-data/20 blur-3xl" />
        <div className="relative flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <p className="text-sm font-semibold text-primary">{greeting()}</p>
            <h1 className="font-display mt-1 text-3xl font-bold tracking-tight sm:text-5xl">
              Welcome back, <span className="text-gradient capitalize">{name}</span>
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
              Your coding profile, resume, interview prep and portfolio in one place. Everything is built only from facts you approve.
            </p>
            {home.next_actions[0] && (
              <Link
                href={home.next_actions[0].href}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-on-primary shadow-lg shadow-primary/30 transition hover:brightness-110"
              >
                {home.next_actions[0].title}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            )}
          </div>
          <div className="flex items-center gap-4 rounded-2xl border border-edge bg-surface/70 p-4 backdrop-blur">
            <ProgressRing percent={percent} label="Profile completeness" />
            <div>
              <p className="font-display text-base font-bold">Profile strength</p>
              <p className="text-sm text-muted">
                {percent >= 100 ? "Fully complete" : percent >= 50 ? "Looking good" : "Just getting started"}
              </p>
              {home.profile && home.profile.pending_proposals > 0 && (
                <p className="mt-1 text-xs font-medium text-warn">{home.profile.pending_proposals} suggestion(s) waiting</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Quick stats */}
      <section aria-label="Overview" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s, i) => (
          <div key={s.label} style={{ animationDelay: `${i * 60}ms` }} className="panel animate-in rounded-2xl p-5">
            <p className="text-sm text-muted">{s.label}</p>
            <p className="font-display mt-1 text-4xl font-bold tracking-tight">
              {s.value === undefined ? "–" : s.value}
            </p>
          </div>
        ))}
      </section>

      {/* Next actions */}
      <section aria-labelledby="next-heading">
        <div className="mb-4 flex items-center gap-2">
          <Rocket className="h-5 w-5 text-primary" aria-hidden="true" />
          <h2 id="next-heading" className="font-display text-xl font-bold tracking-tight">Next best actions</h2>
        </div>
        {home.next_actions.length === 0 ? (
          <div className="panel flex items-center gap-3 rounded-2xl p-5 text-sm text-muted">
            <CheckCircle2 className="h-5 w-5 text-ok" aria-hidden="true" />
            You are up to date. Nothing needs attention right now.
          </div>
        ) : (
          <ol className="grid gap-3 md:grid-cols-2">
            {home.next_actions.map((a, index) => (
              <li key={a.id}>
                <Link
                  href={a.href}
                  style={{ animationDelay: `${index * 70}ms` }}
                  className="panel hover-lift animate-in group flex h-full items-center gap-4 rounded-2xl p-4"
                >
                  <span aria-hidden="true" className="font-display flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-base font-bold text-on-primary shadow-md shadow-primary/30">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{a.title}</span>
                    <span className="block text-sm text-muted">{a.description}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted transition-transform group-hover:translate-x-1 group-hover:text-primary" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* Modules */}
      <section aria-labelledby="modules-heading">
        <h2 id="modules-heading" className="font-display mb-4 text-xl font-bold tracking-tight">Your modules</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          {modules.map((m, i) => (
            <ModuleCard key={m.href} index={i} href={m.href} title={m.title} description={m.description} icon={m.icon} accent={m.accent} statusLabel={statusFor(m.href, home)} />
          ))}
        </div>
      </section>
    </div>
  );
}
