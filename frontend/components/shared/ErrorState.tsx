import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

type ErrorStateProps = {
  title?: string;
  message: string;
  hint?: string;
  referenceId?: string;
  action?: ReactNode;
  className?: string;
};

export function ErrorState({
  title = "Something went wrong",
  message,
  hint,
  referenceId,
  action,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center rounded-2xl border border-coral/50 bg-coral/8 px-6 py-8 text-center",
        className,
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-edge-strong bg-coral text-on-accent shadow-pop">
        <X className="h-5 w-5" aria-hidden="true" />
      </div>
      <h3 className="font-display mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-1 max-w-md text-sm">{message}</p>
      {hint && <p className="mt-2 max-w-md text-sm text-muted">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
      {referenceId && (
        <p className="mt-4 font-mono text-xs text-muted">
          Reference: {referenceId}
        </p>
      )}
    </div>
  );
}