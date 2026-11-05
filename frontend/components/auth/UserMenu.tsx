"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LogOut, Settings, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";

/** Avatar button with a small account menu. */
export function UserMenu() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) return null;
  const email = user.email ?? "Signed in";
  const initial = email.charAt(0).toUpperCase();

  async function handleSignOut() {
    await signOut();
    router.replace("/login");
  }

  const item = "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium hover:bg-ink/6";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="font-display flex h-9 w-9 items-center justify-center rounded-full border border-primary/40 bg-primary text-sm font-bold text-on-primary shadow-card transition-transform hover:-translate-y-px"
      >
        {initial}
      </button>
      {open && (
        <div
          role="menu"
          className="menu-in sticker absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl p-2"
        >
          <div className="border-b border-edge px-3 pb-2.5 pt-1.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">Signed in as</p>
            <p className="truncate text-sm font-semibold" title={email}>{email}</p>
          </div>
          <div className="pt-1.5">
            <Link role="menuitem" href="/profile" onClick={() => setOpen(false)} className={item}>
              <User className="h-4 w-4" aria-hidden="true" /> Profile
            </Link>
            <Link role="menuitem" href="/settings" onClick={() => setOpen(false)} className={item}>
              <Settings className="h-4 w-4" aria-hidden="true" /> Settings
            </Link>
            <button role="menuitem" type="button" onClick={handleSignOut} className={`${item} text-coral`}>
              <LogOut className="h-4 w-4" aria-hidden="true" /> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
