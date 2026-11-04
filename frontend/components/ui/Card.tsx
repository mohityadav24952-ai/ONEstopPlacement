import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type CardProps = Omit<HTMLAttributes<HTMLElement>, "title"> & {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
};

export function Card({
  title,
  description,
  action,
  className,
  children,
  ...rest
}: CardProps) {
  const hasHeader = title || description || action;

  return (
    <section
      className={cn("panel animate-in rounded-2xl p-5 sm:p-6", className)}
      {...rest}
    >
      {hasHeader && (
        <header className="mb-5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {title && (
              <h2 className="font-display text-lg font-semibold tracking-tight">{title}</h2>
            )}
            {description && (
              <p className="mt-1 text-sm leading-relaxed text-muted">{description}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      {children}
    </section>
  );
}
