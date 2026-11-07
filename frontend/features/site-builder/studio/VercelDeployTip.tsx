"use client";

import { useEffect, useState } from "react";
import { Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/Button";

/** localStorage key: once "true", the tip is never shown again in this browser. */
export const VERCEL_TIP_KEY = "hasSeenVercelDeployTip";

function hasSeenTip(): boolean {
  try {
    return window.localStorage.getItem(VERCEL_TIP_KEY) === "true";
  } catch {
    return false; // storage blocked (private mode): just show the tip
  }
}

/** Dismissible one-time hint explaining the publish → deploy order in the portfolio studio. */
export function VercelDeployTip() {
  // Hidden until mounted, so the server render and first client render match (no hydration mismatch).
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(!hasSeenTip());
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      window.localStorage.setItem(VERCEL_TIP_KEY, "true");
    } catch {
      // Not persisted when storage is blocked; it simply shows again next visit.
    }
  }

  if (!visible) return null;

  return (
    <div role="note" aria-label="Quick tip" className="animate-in flex flex-col gap-3 rounded-2xl border border-primary/40 bg-primary/10 p-4 sm:flex-row sm:items-center">
      <span aria-hidden="true" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
        <Lightbulb className="h-5 w-5" />
      </span>
      <p className="min-w-0 flex-1 text-sm">
        <span aria-hidden="true">💡 </span>
        <strong>Quick Tip:</strong> Customise your content and template first, then click <strong>Publish</strong> on the Dashboard. Once
        published, scroll to the bottom of your Dashboard to deploy your portfolio live on Vercel!
      </p>
      <Button size="sm" onClick={dismiss} className="self-end sm:self-auto">
        Got it
      </Button>
    </div>
  );
}
