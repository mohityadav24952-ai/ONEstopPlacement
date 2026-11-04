import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

type ModuleCardProps = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  statusLabel: string;
  /** Tailwind gradient classes, e.g. "from-sky-400 to-blue-600". */
  accent?: string;
  index?: number;
};

export function ModuleCard({
  href,
  title,
  description,
  icon: Icon,
  statusLabel,
  accent = "from-violet-400 to-blue-600",
  index = 0,
}: ModuleCardProps) {
  const active = !/not set up|unavailable/i.test(statusLabel);
  return (
    <Link
      href={href}
      style={{ animationDelay: `${index * 70}ms` }}
      className="panel hover-lift animate-in group relative flex flex-col overflow-hidden rounded-2xl p-6"
    >
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${accent} opacity-20 blur-2xl transition-opacity group-hover:opacity-40`}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${accent} text-white shadow-lg`}>
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>
        <Badge tone={active ? "ok" : "neutral"}>{statusLabel}</Badge>
      </div>
      <h3 className="font-display relative mt-5 text-lg font-bold tracking-tight">{title}</h3>
      <p className="relative mt-1.5 flex-1 text-sm leading-relaxed text-muted">{description}</p>
      <span className="relative mt-5 inline-flex items-center gap-1 text-sm font-semibold text-primary">
        Open
        <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
      </span>
    </Link>
  );
}
