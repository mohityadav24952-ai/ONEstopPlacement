import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/cn";

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-2xl border border-dashed border-edge bg-surface-2/30 px-6 py-10 text-center",
        className,
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/20 text-primary ring-1 ring-primary/30">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <h3 className="font-display mt-4 text-base font-semibold">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}