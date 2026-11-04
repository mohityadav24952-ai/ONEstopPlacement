"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";

export function UserMenu() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  if (!user) return null;

  async function handleSignOut() {
    await signOut();
    router.replace("/login");
  }

  return (
    <div className="flex items-center gap-1">
      <span
        className="hidden max-w-44 truncate rounded-full border border-edge bg-surface-2/60 px-3 py-1 text-xs font-medium text-muted xl:inline"
        title={user.email ?? undefined}
      >
        {user.email}
      </span>
      <button
        type="button"
        onClick={handleSignOut}
        aria-label="Sign out"
        title="Sign out"
        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-fg"
      >
        <LogOut className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  );
}
