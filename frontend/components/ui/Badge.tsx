import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type BadgeTone =
  | "neutral"
  | "primary"
  | "data"
  | "ai"
  | "ok"
  | "warn"
  | "err";

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
};

const tones: Record<BadgeTone, string> = {
  neutral: "border-edge bg-surface-2 text-muted",
  primary: "border-primary/40 bg-primary/15 text-primary",
  data: "border-data/40 bg-data/15 text-data",
  ai: "border-ai/40 bg-ai/15 text-ai",
  ok: "border-ok/40 bg-ok/15 text-ok",
  warn: "border-warn/40 bg-warn/15 text-warn",
  err: "border-err/40 bg-err/15 text-err",
};

export function Badge({ tone = "neutral", className, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide",
        tones[tone],
        className,
      )}
      {...rest}
    />
  );
}
