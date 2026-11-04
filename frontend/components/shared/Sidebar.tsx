"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { NavLink } from "@/components/shared/NavLink";
import { primaryNav, secondaryNav } from "@/lib/navigation";

export function Sidebar() {
  return (
    <aside className="panel fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-y-0 border-l-0 lg:flex">
      <div className="flex h-16 items-center px-5">
        <Link href="/" aria-label="ONEstopPlacement home">
          <Logo />
        </Link>
      </div>

      <nav aria-label="Main" className="flex-1 space-y-1 overflow-y-auto px-3 pb-3 pt-2">
        <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted/80">
          Workspace
        </p>
        {primaryNav.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </nav>

      <div className="space-y-3 p-3">
        <nav aria-label="Account" className="space-y-1 border-t border-edge pt-3">
          {secondaryNav.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </nav>
        <div className="flex items-start gap-2.5 rounded-xl border border-edge bg-surface-2/60 p-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-ok" aria-hidden="true" />
          <p className="text-xs leading-snug text-muted">
            Only facts you approve reach your resume and portfolio.
          </p>
        </div>
      </div>
    </aside>
  );
}
