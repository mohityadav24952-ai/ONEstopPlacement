"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { NavLink } from "@/components/shared/NavLink";
import { primaryNav, secondaryNav } from "@/lib/navigation";

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-rail-line bg-rail text-rail-fg lg:flex">
      <div className="flex h-[72px] items-center px-5">
        <Link href="/" aria-label="ONEstopPlacement home">
          <Logo />
        </Link>
      </div>

      <nav aria-label="Main" className="flex-1 space-y-1 overflow-y-auto px-3 pb-3 pt-2">
        {primaryNav.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </nav>

      <div className="space-y-3 p-3">
        <nav aria-label="Account" className="space-y-1">
          <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-rail-muted">You</p>
          {secondaryNav.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </nav>
        <div className="flex items-start gap-2.5 rounded-xl border border-primary/30 bg-primary/10 p-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <p className="text-xs leading-snug text-rail-muted">
            <span className="font-semibold text-rail-fg">You stay in control.</span> Only facts you approve reach your resume and portfolio.
          </p>
        </div>
      </div>
    </aside>
  );
}
