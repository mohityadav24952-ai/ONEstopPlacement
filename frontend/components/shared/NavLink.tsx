"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { isActive } from "@/lib/navigation";
import type { NavItem } from "@/lib/navigation";

type NavLinkProps = {
  item: NavItem;
  variant?: "sidebar" | "tab";
};

export function NavLink({ item, variant = "sidebar" }: NavLinkProps) {
  const pathname = usePathname();
  const active = isActive(pathname, item.href);
  const Icon = item.icon;

  if (variant === "tab") {
    return (
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "relative flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors",
          active ? "text-primary" : "text-muted hover:text-fg",
        )}
      >
        {active && (
          <span aria-hidden="true" className="absolute top-0 h-0.5 w-8 rounded-full bg-brand" />
        )}
        <Icon className="h-5 w-5" aria-hidden="true" />
        {item.shortLabel}
      </Link>
    );
  }

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all",
        active
          ? "bg-primary/15 text-fg shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--primary)_35%,transparent)]"
          : "text-muted hover:bg-surface-2 hover:text-fg",
      )}
    >
      {active && (
        <span aria-hidden="true" className="absolute -left-3 h-6 w-1 rounded-r-full bg-brand" />
      )}
      <span
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
          active ? "bg-brand text-on-primary shadow-md shadow-primary/30" : "bg-surface-2 text-muted group-hover:text-primary",
        )}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      {item.label}
    </Link>
  );
}
