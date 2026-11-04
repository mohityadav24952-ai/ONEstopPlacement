"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/auth/supabase";
import { DEV_BYPASS, DEV_EMAIL, DEV_TOKEN, isDevSignedIn, setDevSignedIn } from "@/lib/auth/dev";

type AuthState = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  configError: string | null;
  signOut: () => Promise<void>;
  /** Dev bypass only: sign in as the local dev user. */
  devSignIn: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

// A minimal stand-in for a Supabase session, used only by the dev bypass.
const DEV_SESSION = {
  access_token: DEV_TOKEN,
  token_type: "bearer",
  user: { id: "dev-user", email: DEV_EMAIL },
} as unknown as Session;

function initClient(): {
  supabase: SupabaseClient | null;
  error: string | null;
} {
  if (DEV_BYPASS) return { supabase: null, error: null };
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
    if (DEV_BYPASS) {
      // Reading localStorage must happen after mount to match server rendering.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSession(isDevSignedIn() ? DEV_SESSION : null);
      setResolved(true);
      return;
    }
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
    if (DEV_BYPASS) {
      setDevSignedIn(false);
      setSession(null);
      return;
    }
    await init.supabase?.auth.signOut();
  }

  function devSignIn() {
    setDevSignedIn(true);
    setSession(DEV_SESSION);
  }

  const value: AuthState = {
    user: session?.user ?? null,
    session,
    loading: init.supabase || DEV_BYPASS ? !resolved : false,
    configError: init.error,
    signOut,
    devSignIn,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
