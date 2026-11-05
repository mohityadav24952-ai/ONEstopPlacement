"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { ACCENT, MODULE_ACCENT } from "@/lib/accent";
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
  const accent = ACCENT[MODULE_ACCENT[item.href] ?? "cobalt"];

  if (variant === "tab") {
    return (
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "relative flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-bold transition-colors",
          active ? "text-ink" : "text-muted hover:text-ink",
        )}
      >
        <span
          className={cn(
            "flex h-8 w-12 items-center justify-center rounded-full transition-colors",
            active ? cn(accent.bg, accent.onSolid) : "",
          )}
        >
          <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
        </span>
        {item.shortLabel}
      </Link>
    );
  }

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
        active ? "bg-rail-fg text-ink" : "text-rail-muted hover:bg-rail-fg/10 hover:text-rail-fg",
      )}
    >
      <span
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-lg transition-colors",
          active ? cn(accent.bg, accent.onSolid) : "bg-rail-fg/10 text-rail-fg/80 group-hover:bg-rail-fg/15",
        )}
      >
        <Icon className="h-[15px] w-[15px]" aria-hidden="true" />
      </span>
      {item.label}
      {active && <span aria-hidden="true" className={cn("ml-auto h-2 w-2 rounded-full", accent.bg)} />}
    </Link>
  );
}
