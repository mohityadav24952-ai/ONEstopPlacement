import type { ReactNode } from "react";
import { ACCENT } from "@/lib/accent";
import type { Accent } from "@/lib/accent";

type PageHeaderProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  /** Small label above the title, usually the module name. */
  eyebrow?: string;
  accent?: Accent;
};

/** Editorial page heading: a coloured eyebrow, a big serif title, and a supporting line. */
export function PageHeader({ title, description, action, eyebrow, accent = "cobalt" }: PageHeaderProps) {
  const a = ACCENT[accent];
  return (
    <div className="animate-in mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-edge-strong pb-6">
      <div className="min-w-0">
        {eyebrow && (
          <p className={`mb-3 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] ${a.text}`}>
            <span aria-hidden="true" className={`h-2 w-2 rounded-full ${a.dot}`} />
            {eyebrow}
          </p>
        )}
        <h1 className="text-3xl font-bold leading-tight sm:text-4xl">{title}</h1>
        {description && (
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
