import { cn } from "@/lib/cn";
import { ACCENT } from "@/lib/accent";
import type { Accent } from "@/lib/accent";

type ProgressBarProps = {
  value: number;
  max?: number;
  label: string;
  accent?: Accent;
  className?: string;
  /** Show segment ticks (e.g. for a 0-7 star rating). */
  segments?: number;
};

export function ProgressBar({ value, max = 100, label, accent = "cobalt", className, segments }: ProgressBarProps) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      className={cn("relative h-2.5 w-full overflow-hidden rounded-full bg-ink/10", className)}
    >
      <div
        className={cn("fx-bar h-full rounded-full transition-[width] duration-700 ease-out", ACCENT[accent].bg)}
        style={{ width: `${pct}%` }}
      />
      {segments && segments > 1 && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex">
          {Array.from({ length: segments - 1 }, (_, i) => (
            <span key={i} className="h-full flex-1 border-r-2 border-surface" />
          ))}
          <span className="flex-1" />
        </div>
      )}
    </div>
  );
}
