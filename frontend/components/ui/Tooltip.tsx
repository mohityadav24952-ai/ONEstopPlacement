"use client";

import { useId } from "react";
import type { ReactNode } from "react";

type TooltipProps = {
  text: string;
  children: ReactNode;
  side?: "top" | "bottom";
};

/** CSS-only tooltip that also shows on keyboard focus. Wrap a focusable element. */
export function Tooltip({ text, children, side = "bottom" }: TooltipProps) {
  const id = useId();
  return (
    <span className="group/tip relative inline-flex" aria-describedby={id}>
      {children}
      <span
        id={id}
        role="tooltip"
        className={`pointer-events-none absolute left-1/2 z-50 w-max max-w-56 -translate-x-1/2 rounded-lg bg-ink px-2.5 py-1.5 text-center text-xs font-medium leading-snug text-app opacity-0 shadow-lg transition-opacity duration-150 group-hover/tip:opacity-100 group-focus-within/tip:opacity-100 ${
          side === "top" ? "bottom-full mb-2" : "top-full mt-2"
        }`}
      >
        {text}
      </span>
    </span>
  );
}
