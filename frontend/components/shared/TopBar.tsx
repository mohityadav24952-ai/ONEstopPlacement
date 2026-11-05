"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ApiStatus } from "@/components/shared/ApiStatus";
import { Logo } from "@/components/shared/Logo";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { UserMenu } from "@/components/auth/UserMenu";
import { Tooltip } from "@/components/ui/Tooltip";
import { titleFor } from "@/lib/navigation";

export function TopBar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-edge bg-app/85 px-4 backdrop-blur sm:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <Link href="/" aria-label="ONEstopPlacement home" className="lg:hidden">
          <Logo compact />
        </Link>
        <p className="hidden items-center gap-2 truncate text-sm lg:flex">
          <span className="font-medium text-muted">Workspace</span>
          <span aria-hidden="true" className="text-edge">/</span>
          <span className="font-bold">{titleFor(pathname)}</span>
        </p>
        <p className="truncate text-sm font-bold lg:hidden">{titleFor(pathname)}</p>
      </div>

      <div className="flex items-center gap-2">
        <ApiStatus />
        <Tooltip text="Switch light and dark theme">
          <ThemeToggle />
        </Tooltip>
        <UserMenu />
      </div>
    </header>
  );
}
