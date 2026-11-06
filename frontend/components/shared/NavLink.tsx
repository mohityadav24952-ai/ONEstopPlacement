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
        <span className={cn("flex h-8 w-12 items-center justify-center rounded-full transition-colors", active ? "bg-primary/15" : "")}>
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
        "fx-nav group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-150",
        active ? "bg-primary text-on-primary shadow-card" : "text-rail-muted hover:bg-primary/10 hover:text-rail-fg",
      )}
    >
      <Icon className={cn("h-[18px] w-[18px] shrink-0", active ? "" : "group-hover:text-primary")} aria-hidden="true" />
      {item.label}
    </Link>
  );
}
