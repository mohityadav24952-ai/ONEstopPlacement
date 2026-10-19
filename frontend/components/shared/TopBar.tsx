"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ApiStatus } from "@/components/shared/ApiStatus";
import { Logo } from "@/components/shared/Logo";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { secondaryNav, titleFor } from "@/lib/navigation";

export function TopBar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-edge bg-app/85 px-4 backdrop-blur sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <Link href="/" aria-label="ONEstopPlacement home" className="lg:hidden">
          <Logo />
        </Link>
        <p className="font-display hidden truncate text-lg font-semibold lg:block">
          {titleFor(pathname)}
        </p>
      </div>

      <div className="flex items-center gap-1">
        <div className="flex items-center gap-1 lg:hidden">
          {secondaryNav.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                className="flex h-9 w-9 items-center justify-center rounded-md text-muted transition-colors hover:bg-edge/40 hover:text-fg"
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
              </Link>
            );
          })}
        </div>
        <ApiStatus />
        <ThemeToggle />
      </div>
    </header>
  );
}
