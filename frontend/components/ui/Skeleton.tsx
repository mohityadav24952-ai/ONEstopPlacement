import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Skeleton({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn("rounded-xl", className)}
      style={{
        background:
          "linear-gradient(100deg, var(--surface-2) 30%, color-mix(in srgb, var(--surface-2) 55%, var(--surface)) 50%, var(--surface-2) 70%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.6s linear infinite",
      }}
      {...rest}
    />
  );
}
