"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    let cancelled = false;
    checkApi().then((result) => {
      if (!cancelled) setStatus(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function recheck() {
    setStatus({ kind: "checking" });
    checkApi().then(setStatus);
  }

  const { label, detail, dot } = describe(status);

  return (
    <button
      type="button"
      onClick={recheck}
      title={`${detail}. Click to check again.`}
      aria-label={`${detail}. Activate to check again.`}
      className="flex h-9 items-center gap-2 rounded-full border border-edge bg-surface-2/50 px-3 text-xs font-medium text-muted transition-colors hover:border-primary/50 hover:text-fg"
    >
      <span aria-hidden="true" className={cn("h-2 w-2 rounded-full shadow-[0_0_8px_currentColor]", dot, dot === "bg-ok" ? "text-ok" : dot === "bg-warn" ? "text-warn" : "text-muted")} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
