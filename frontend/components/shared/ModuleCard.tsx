import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";

type ModuleCardProps = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  statusLabel: string;
};

export function ModuleCard({
  href,
  title,
  description,
  icon: Icon,
  statusLabel,
}: ModuleCardProps) {
  return (
    <article className="flex flex-col rounded-lg border border-edge bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/15 text-primary">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <Badge>{statusLabel}</Badge>
      </div>
      <h3 className="font-display mt-4 text-base font-semibold">{title}</h3>
      <p className="mt-1 flex-1 text-sm text-muted">{description}</p>
      <div className="mt-4">
        <Link
          href={href}
          className={buttonClasses({ variant: "secondary", size: "sm" })}
        >
          Open
        </Link>
      </div>
    </article>
  );
}
