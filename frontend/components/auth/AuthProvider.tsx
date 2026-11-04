"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/auth/supabase";

type AuthState = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  configError: string | null;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

function initClient(): {
  supabase: SupabaseClient | null;
  error: string | null;
} {
  try {
    return { supabase: getSupabase(), error: null };
  } catch (err) {
    return {
      supabase: null,
      error: err instanceof Error ? err.message : "Sign-in is not configured.",
    };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [init] = useState(initClient);
  const [session, setSession] = useState<Session | null>(null);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    if (!init.supabase) return;
    let active = true;

    init.supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setSession(data.session);
        setResolved(true);
      }
    });

    const { data: listener } = init.supabase.auth.onAuthStateChange(
      (_event, next) => {
        if (active) {
          setSession(next);
          setResolved(true);
        }
      },
    );

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [init]);

  async function signOut() {
    await init.supabase?.auth.signOut();
  }

  const value: AuthState = {
    user: session?.user ?? null,
    session,
    loading: init.supabase ? !resolved : false,
    configError: init.error,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
