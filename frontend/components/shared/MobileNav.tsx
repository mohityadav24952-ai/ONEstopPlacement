"use client";

import { NavLink } from "@/components/shared/NavLink";
import { primaryNav } from "@/lib/navigation";

export function MobileNav() {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-ink bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <div className="grid grid-cols-5">
        {primaryNav.map((item) => (
          <NavLink key={item.href} item={item} variant="tab" />
        ))}
      </div>
    </nav>
  );
}
