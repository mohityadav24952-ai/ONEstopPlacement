"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { RefreshCw, WifiOff, X } from "lucide-react";
import { OFFLINE_MESSAGE } from "@/lib/api/client";
import { checkApi } from "@/lib/api/health";
import type { ApiHealthResult } from "@/lib/api/health";
import { cn } from "@/lib/cn";

type Status = { kind: "checking" } | ApiHealthResult;

function describe(status: Status): {
  label: string;
  detail: string;
  dot: string;
} {
  switch (status.kind) {
    case "checking":
      return {
        label: "Checking API",
        detail: "Checking the API connection",
        dot: "bg-muted",
      };
    case "ok":
      return {
        label: "API connected",
        detail: `API connected (${status.health.environment}, v${status.health.version})`,
        dot: "bg-ok",
      };
    case "down":
      return {
        label: "API offline",
        detail: `API unavailable: ${status.message}`,
        dot: "bg-warn",
      };
  }
}

export function ApiStatus() {
  const [status, setStatus] = useState<Status>({ kind: "checking" });
  // Banner state: kept separate from `status` so the banner stays put (with a spinner) while retrying.
  const [retrying, setRetrying] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    checkApi().then((result) => {
      if (!cancelled) setStatus(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // When the browser reports the connection is back, check again on its own.
  useEffect(() => {
    if (status.kind !== "down") return;
    const onOnline = () => {
      setRetrying(true);
      checkApi().then((result) => {
        setStatus(result);
        setRetrying(false);
      });
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [status.kind]);

  function recheck() {
    setStatus({ kind: "checking" });
    setDismissed(false);
    checkApi().then(setStatus);
  }

  function retry() {
    if (retrying) return;
    setRetrying(true);
    checkApi().then((result) => {
      setStatus(result);
      setRetrying(false);
    });
  }

  const { label, detail, dot } = describe(status);
  const showBanner = status.kind === "down" && !dismissed;

  return (
    <>
      <button
        type="button"
        onClick={recheck}
        title={`${detail}. Click to check again.`}
        aria-label={`${detail}. Activate to check again.`}
        className="flex h-9 items-center gap-2 rounded-full border-[1.5px] border-edge bg-surface px-3 text-xs font-semibold text-muted transition-colors hover:border-edge-strong hover:text-fg"
      >
        <span aria-hidden="true" className={cn("h-2 w-2 rounded-full ", dot, dot === "bg-ok" ? "text-ok" : dot === "bg-warn" ? "text-warn" : "text-muted")} />
        <span className="hidden sm:inline">{label}</span>
      </button>
      {/* Portal: the TopBar's backdrop-blur would otherwise become the containing block for `fixed`. */}
      {showBanner && typeof document !== "undefined" &&
        createPortal(<OfflineBanner retrying={retrying} onRetry={retry} onDismiss={() => setDismissed(true)} />, document.body)}
    </>
  );
}

function OfflineBanner({ retrying, onRetry, onDismiss }: { retrying: boolean; onRetry: () => void; onDismiss: () => void }) {
  return (
    <div
      role="alert"
      className="animate-in fixed left-1/2 top-[84px] z-[60] flex w-[min(36rem,calc(100vw-2rem))] -translate-x-1/2 items-start gap-3 rounded-2xl border border-warn/50 bg-surface p-3.5 shadow-pop sm:items-center"
    >
      <span aria-hidden="true" className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-warn/15 text-warn sm:mt-0">
        <WifiOff className="h-4 w-4" />
      </span>
      <p className="min-w-0 flex-1 text-sm font-medium">{OFFLINE_MESSAGE}</p>
      <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          aria-busy={retrying || undefined}
          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-3.5 text-xs font-bold text-on-primary transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-70"
        >
          <RefreshCw aria-hidden="true" className={cn("h-3.5 w-3.5", retrying && "motion-safe:animate-spin")} />
          {retrying ? "Retrying…" : "Retry"}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss connection warning"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-fg"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
