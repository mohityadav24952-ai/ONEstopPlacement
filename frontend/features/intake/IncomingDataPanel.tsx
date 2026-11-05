"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, ChevronDown, Inbox, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useFeedback } from "@/components/ui/Feedback";
import { PlatformIcon } from "@/components/shared/PlatformIcon";
import { describeError } from "@/lib/api/errors";
import * as api from "@/lib/api/intake";
import type { IntakeRequest, IntakeState } from "@/lib/api/intake";
import type { Proposal } from "@/lib/api/profile";
import { cn } from "@/lib/cn";

/** One short line for a resume item waiting as a proposal. */
function summarize(p: Proposal): string {
  const v = p.payload as Record<string, unknown>;
  const main = (v.title ?? v.name ?? v.institution ?? v.organization ?? "") as string;
  const extra = (v.degree ?? v.issuer ?? "") as string;
  return [main, extra].filter(Boolean).join(" · ") || "New item";
}

function groupBySection(proposals: Proposal[]): [string, Proposal[]][] {
  const map = new Map<string, Proposal[]>();
  for (const p of proposals) map.set(p.section, [...(map.get(p.section) ?? []), p]);
  return [...map.entries()];
}

/**
 * Everything found in the user's resume that is waiting for approval: coding accounts, basic profile
 * details and the resume's sections. ONE Approve all and ONE Reject all sit at the top, so nobody has to
 * decide on dozens of individual fields; each item can still be decided on its own.
 * Shown on both the Coding Dashboard and the Profile page; it renders nothing when nothing is waiting.
 */
export function IncomingDataPanel({ className }: { className?: string }) {
  const { toast, confirm } = useFeedback();
  const [state, setState] = useState<IntakeState | null>(null);
  const [busy, setBusy] = useState<"approve" | "reject" | string | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setState(await api.getIntake());
    } catch {
      setState(null); // the panel is optional: if it cannot load, the page works without it
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
    window.addEventListener(api.INTAKE_CHANGED, refresh);
    return () => window.removeEventListener(api.INTAKE_CHANGED, refresh);
  }, [refresh]);

  const changed = useCallback(async () => {
    await refresh();
    window.dispatchEvent(new Event(api.INTAKE_APPLIED)); // the page this sits on reloads its own data
  }, [refresh]);

  if (!state || state.total === 0) return null;

  const coding = state.requests.filter((r) => r.kind === "CODING_ACCOUNT");
  const fields = state.requests.filter((r) => r.kind === "PROFILE_FIELD");

  async function all(kind: "approve" | "reject") {
    setError(null);
    if (kind === "reject" && !(await confirm({ title: "Reject everything?", message: `All ${state!.total} waiting items will be discarded. You can always add details by hand later.`, confirmLabel: "Reject all", tone: "danger" }))) return;
    setBusy(kind);
    try {
      if (kind === "approve") {
        const r = await api.approveAll();
        toast(r.failed ? `Approved ${r.approved}. ${r.failed} could not be connected: see below.` : `Approved ${r.approved} item(s).`, r.failed ? "info" : "success");
        if (r.failed) setOpen(true);
      } else {
        toast(`Rejected ${(await api.rejectAll()).rejected} item(s).`, "info");
      }
      await changed();
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(null);
    }
  }

  async function one(r: IntakeRequest, decision: "approve" | "reject") {
    setError(null);
    setBusy(r.id);
    try {
      const out = await api.decideRequest(r.id, decision);
      if (out.status === "FAILED") setError(out.message ?? "Could not connect that account.");
      else toast(decision === "approve" ? "Approved." : "Rejected.", decision === "approve" ? "success" : "info");
      await changed();
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(null);
    }
  }

  async function oneProposal(p: Proposal, decision: "approve" | "reject") {
    setError(null);
    setBusy(p.id);
    try {
      const { decideProposal } = await import("@/lib/api/profile");
      await decideProposal(p.id, decision);
      await changed();
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(null);
    }
  }

  const parts = [
    coding.length ? `${coding.length} coding account${coding.length > 1 ? "s" : ""}` : null,
    fields.length ? `${fields.length} profile detail${fields.length > 1 ? "s" : ""}` : null,
    state.proposals.length ? `${state.proposals.length} resume item${state.proposals.length > 1 ? "s" : ""}` : null,
  ].filter(Boolean);

  return (
    <section aria-labelledby="incoming-title" className={cn("panel animate-in rounded-2xl border-lavender/40 p-5 sm:p-6", className)}>
      <div className="flex flex-wrap items-start gap-4">
        <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-lavender/20 text-lavender"><Inbox className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-lavender">Incoming data</p>
          <h2 id="incoming-title" className="font-display text-xl font-semibold leading-snug">Found in your resume</h2>
          <p className="mt-0.5 text-sm text-muted">{parts.join(" · ")}. Nothing is used until you approve it.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button loading={busy === "approve"} disabled={busy !== null && busy !== "approve"} onClick={() => void all("approve")}><Check className="h-4 w-4" aria-hidden="true" /> Approve All</Button>
          <Button variant="secondary" loading={busy === "reject"} disabled={busy !== null && busy !== "reject"} onClick={() => void all("reject")}><X className="h-4 w-4" aria-hidden="true" /> Reject All</Button>
        </div>
      </div>

      {busy === "approve" && <p role="status" className="mt-3 text-sm text-muted">Connecting accounts and fetching live data. This can take a few seconds...</p>}
      {error && <p role="alert" className="mt-3 text-sm font-medium text-err">{error}</p>}

      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-muted hover:text-fg">
        Review items one by one <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>

      {open && (
        <div className="mt-3 space-y-5">
          {coding.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-bold">Coding accounts</h3>
              <ul className="space-y-2">
                {coding.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-edge p-3">
                    <PlatformIcon platform={r.payload.platform!} size={36} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{r.payload.label} · {r.payload.username}</p>
                      {r.status === "FAILED" && <p className="text-xs text-err">{r.message}</p>}
                    </div>
                    {r.status === "FAILED" && <Badge tone="err">Could not connect</Badge>}
                    <Button size="sm" loading={busy === r.id} disabled={busy !== null && busy !== r.id} onClick={() => void one(r, "approve")}>{r.status === "FAILED" ? "Retry" : "Approve"}</Button>
                    <Button size="sm" variant="ghost" disabled={busy !== null} onClick={() => void one(r, "reject")}>Reject</Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {fields.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-bold">Profile details</h3>
              <ul className="space-y-2">
                {fields.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-edge p-3">
                    <p className="min-w-0 flex-1 text-sm"><span className="font-semibold">{r.payload.label}:</span> {r.payload.value}</p>
                    <Button size="sm" loading={busy === r.id} disabled={busy !== null && busy !== r.id} onClick={() => void one(r, "approve")}>Approve</Button>
                    <Button size="sm" variant="ghost" disabled={busy !== null} onClick={() => void one(r, "reject")}>Reject</Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {groupBySection(state.proposals).map(([section, items]) => (
            <div key={section}>
              <h3 className="mb-2 text-sm font-bold capitalize">{section} ({items.length})</h3>
              <ul className="space-y-2">
                {items.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-edge p-3">
                    <p className="min-w-0 flex-1 break-words text-sm">{summarize(p)}</p>
                    <Button size="sm" loading={busy === p.id} disabled={busy !== null && busy !== p.id} onClick={() => void oneProposal(p, "approve")}>Approve</Button>
                    <Button size="sm" variant="ghost" disabled={busy !== null} onClick={() => void oneProposal(p, "reject")}>Reject</Button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
