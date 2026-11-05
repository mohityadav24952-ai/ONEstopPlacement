import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { ACCENT } from "@/lib/accent";
import type { Accent } from "@/lib/accent";

export type CardProps = Omit<HTMLAttributes<HTMLElement>, "title"> & {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  /** A small numbered/labelled eyebrow above the title, e.g. "Step 1". */
  eyebrow?: ReactNode;
  accent?: Accent;
  /** Render with the chunky ink outline instead of the paper style. */
  sticker?: boolean;
};

export function Card({
  title,
  description,
  action,
  eyebrow,
  accent = "cobalt",
  sticker = false,
  className,
  children,
  ...rest
}: CardProps) {
  const hasHeader = title || description || action || eyebrow;
  const a = ACCENT[accent];

  return (
    <section
      className={cn(
        sticker ? "sticker" : "panel",
        "animate-in rounded-2xl p-5 sm:p-6",
        className,
      )}
      {...rest}
    >
      {hasHeader && (
        <header className="mb-5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {eyebrow && (
              <p className={cn("mb-1.5 text-[11px] font-bold uppercase tracking-[0.16em]", a.text)}>
                {eyebrow}
              </p>
            )}
            {title && (
              <h2 className="font-display text-xl font-semibold leading-snug">{title}</h2>
            )}
            {description && (
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">{description}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      {children}
    </section>
  );
}
