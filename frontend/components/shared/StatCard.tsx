import { cn } from "@/lib/cn";
import { DemoBadge } from "@/components/shared/DemoBadge";

type StatCardProps = {
  label: string;
  value: string;
  hint?: string;
  demo?: boolean;
  className?: string;
};

export function StatCard({
  label,
  value,
  hint,
  demo = false,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn("rounded-lg border border-edge bg-surface p-4", className)}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-muted">{label}</p>
        {demo && <DemoBadge />}
      </div>
      <p className="font-display mt-2 text-3xl font-bold">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}
