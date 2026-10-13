"use client";

import Link from "next/link";
import { Logo } from "@/components/shared/Logo";
import { NavLink } from "@/components/shared/NavLink";
import { primaryNav, secondaryNav } from "@/lib/navigation";

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-edge bg-surface lg:flex">
      <div className="flex h-16 items-center border-b border-edge px-5">
        <Link href="/" aria-label="ONEstopPlacement home">
          <Logo />
        </Link>
      </div>

      <nav aria-label="Main" className="flex-1 space-y-1 overflow-y-auto p-3">
        {primaryNav.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </nav>

      <nav aria-label="Account" className="space-y-1 border-t border-edge p-3">
        {secondaryNav.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </nav>
    </aside>
  );
}
