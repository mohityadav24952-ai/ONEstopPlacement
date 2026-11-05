"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ApiStatus } from "@/components/shared/ApiStatus";
import { Logo } from "@/components/shared/Logo";
import { ThemeSwitcher } from "@/components/shared/ThemeSwitcher";
import { UserMenu } from "@/components/auth/UserMenu";
import { PlaceyHost } from "@/components/placey/PlaceyHost";
import { titleFor } from "@/lib/navigation";

export function TopBar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between gap-3 border-b border-edge bg-app/80 px-4 backdrop-blur-md sm:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <Link href="/" aria-label="ONEstopPlacement home" className="lg:hidden">
          <Logo compact />
        </Link>
        <p className="min-w-0 truncate text-sm font-semibold lg:hidden">{titleFor(pathname)}</p>
        {/* Placey lives here, at the top-left of the bar. The slot is as tall as the bar, so it never covers other controls. */}
        <div className="relative h-[72px] w-16 shrink-0 lg:w-[88px]">
          <PlaceyHost />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <ApiStatus />
        <ThemeSwitcher />
        <UserMenu />
      </div>
    </header>
  );
}
