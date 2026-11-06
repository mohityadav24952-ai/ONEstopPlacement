import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Skeleton({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      // fx-skeleton (app/effects.css): a composited sheen (transform only) instead of repainting a moving background
      className={cn("fx-skeleton rounded-xl", className)}
      {...rest}
    />
  );
}
