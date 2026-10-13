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
          "flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors",
          active ? "text-primary" : "text-muted hover:text-fg",
        )}
      >
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
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-primary/15 text-primary"
          : "text-muted hover:bg-edge/40 hover:text-fg",
      )}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {item.label}
    </Link>
  );
}