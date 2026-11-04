import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="animate-in mb-8 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl"><span className="text-gradient">{title}</span></h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
