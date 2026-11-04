"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { buttonClasses, Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/shared/ErrorState";
import { ModuleCard } from "@/components/shared/ModuleCard";
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

export function HomeView() {
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
      <div role="status" className="space-y-4">
        <span className="sr-only">Loading your overview</span>
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {home.unavailable.length > 0 && (
        <p role="status" className="rounded-md border border-warn/40 bg-warn/10 p-3 text-sm">
          Some sections could not load ({home.unavailable.join(", ")}). The rest still work.
        </p>
      )}

      <Card title="Next best actions" description="Suggested from the current state of your profile and work.">
        {home.next_actions.length === 0 ? (
          <p className="text-sm text-muted">You are up to date. Nothing needs attention right now.</p>
        ) : (
          <ol className="space-y-3">
            {home.next_actions.map((a, index) => (
              <li key={a.id} className="flex flex-col gap-3 rounded-md border border-edge p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">{index + 1}</span>
                  <div className="min-w-0">
                    <p className="font-medium">{a.title}</p>
                    <p className="text-sm text-muted">{a.description}</p>
                  </div>
                </div>
                <Link href={a.href} className={buttonClasses({ variant: "secondary", size: "sm", className: "shrink-0" })}>Go</Link>
              </li>
            ))}
          </ol>
        )}
      </Card>

      {home.profile && (
        <p className="text-sm text-muted">
          Profile {home.profile.percent}% complete
          {home.profile.pending_proposals ? ` · ${home.profile.pending_proposals} suggestion(s) waiting` : ""}.
        </p>
      )}

      <section aria-labelledby="modules-heading">
        <h2 id="modules-heading" className="font-display mb-3 text-lg font-semibold">Your modules</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {modules.map((m) => (
            <ModuleCard key={m.href} href={m.href} title={m.title} description={m.description} icon={m.icon} statusLabel={statusFor(m.href, home)} />
          ))}
        </div>
      </section>
    </div>
  );
}
