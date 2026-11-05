"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { NavLink } from "@/components/shared/NavLink";
import { primaryNav, secondaryNav } from "@/lib/navigation";

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-rail text-rail-fg lg:flex">
      <div className="flex h-20 items-center px-6">
        <Link href="/" aria-label="ONEstopPlacement home">
          <Logo onDark />
        </Link>
      </div>

      <nav aria-label="Main" className="flex-1 space-y-1 overflow-y-auto px-3 pb-3">
        <p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-rail-muted">
          Workspace
        </p>
        {primaryNav.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </nav>

      <div className="space-y-3 p-3">
        <nav aria-label="Account" className="space-y-1">
          <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-rail-muted">
            You
          </p>
          {secondaryNav.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </nav>
        <div className="flex items-start gap-2.5 rounded-xl border border-rail-fg/15 p-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-mint" aria-hidden="true" />
          <p className="text-xs leading-snug text-rail-muted">
            Only facts you approve reach your resume and portfolio.
          </p>
        </div>
      </div>
    </aside>
  );
}
