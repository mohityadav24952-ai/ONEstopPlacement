"use client";

import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { describeError } from "@/lib/api/errors";
import * as api from "@/lib/api/site";
import type { PortfolioData } from "@/types/portfolio";
import { cn } from "@/lib/cn";

type Status = { kind: "idle" } | { kind: "checking" } | { kind: "ok"; message: string } | { kind: "bad"; message: string };

export function ClaimHandleView({ onClaimed }: { onClaimed: (data: PortfolioData) => void }) {
  const [handle, setHandle] = useState("");
  const [terms, setTerms] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounced availability check (300 ms). A stale answer is ignored if the text changed meanwhile.
  useEffect(() => {
    const value = handle.trim().toLowerCase();
    if (!value) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus({ kind: "idle" });
      return;
    }
    setStatus({ kind: "checking" });
    let current = true;
    const t = window.setTimeout(async () => {
      try {
        const r = await api.checkHandle(value);
        if (current) setStatus(r.available ? { kind: "ok", message: r.message } : { kind: "bad", message: r.message });
      } catch (err) {
        if (current) setStatus({ kind: "bad", message: describeError(err) });
      }
    }, 300);
    return () => {
      current = false;
      window.clearTimeout(t);
    };
  }, [handle]);

  async function claim() {
    setBusy(true);
    setError(null);
    try {
      onClaimed(await api.claimHandle(handle.trim().toLowerCase(), terms));
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  const clean = handle.trim().toLowerCase();
  return (
    <div className="mx-auto max-w-md">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (status.kind === "ok" && terms) void claim();
        }}
        className="sticker animate-in space-y-5 rounded-3xl p-7"
      >
        <div>
          <h2 className="font-display text-3xl font-bold">Claim your handle.</h2>
          <p className="mt-1 text-sm text-muted">This will be your unique portfolio link.</p>
        </div>
        <div className="space-y-2">
          <label htmlFor="handle" className="sr-only">Handle</label>
          <div className={cn("field flex items-center gap-1 !py-2", status.kind === "bad" && "!border-err", status.kind === "ok" && "!border-ok")}>
            <input
              id="handle"
              value={handle}
              onChange={(e) => setHandle(e.target.value.replace(/\s/g, "").slice(0, 30))}
              placeholder="yourname"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              aria-describedby="handle-status"
              className="min-w-0 flex-1 bg-transparent text-lg font-bold outline-none"
            />
            <span className="shrink-0 text-sm text-muted">.onestop.tech</span>
          </div>
          <p className="text-xs text-muted">Your page: <span className="font-semibold text-fg">/p/{clean || "yourname"}</span></p>
          <p id="handle-status" role="status" className="min-h-5 text-sm font-semibold">
            {status.kind === "checking" && (
              <span className="inline-flex items-center gap-1.5 text-muted"><Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> Checking...</span>
            )}
            {status.kind === "ok" && (
              <span className="inline-flex items-center gap-1 text-ok"><Check className="h-4 w-4" aria-hidden="true" /> {status.message}</span>
            )}
            {status.kind === "bad" && <span className="text-err">{status.message}</span>}
          </p>
        </div>
        <label className="flex items-start gap-2.5 text-sm">
          <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--primary)]" />
          <span>I agree to the Terms and Conditions and Privacy Policy.</span>
        </label>
        {error && <p role="alert" className="text-sm font-medium text-err">{error}</p>}
        <Button type="submit" loading={busy} disabled={status.kind !== "ok" || !terms} className="w-full !rounded-full">Claim Handle</Button>
        <p className="text-center text-xs text-muted">Your site stays private until you publish it.</p>
      </form>
    </div>
  );
}
