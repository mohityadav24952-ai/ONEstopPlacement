"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Logo } from "@/components/shared/Logo";
import { useAuth } from "@/components/auth/AuthProvider";
import { getSupabase } from "@/lib/auth/supabase";
import { DEV_BYPASS } from "@/lib/auth/dev";

type Mode = "signin" | "signup";

const inputClass =
  "h-10 w-full rounded-md border border-edge bg-app px-3 text-sm text-fg placeholder:text-muted";

export function LoginForm() {
  const router = useRouter();
  const { session, loading, configError, devSignIn } = useAuth();

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && session) router.replace("/");
  }, [loading, session, router]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (password.length < 8) {
      setError("Use a password with at least 8 characters.");
      return;
    }

    setBusy(true);
    try {
      const supabase = getSupabase();
      if (mode === "signin") {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (authError) setError(authError.message);
      } else {
        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (authError) setError(authError.message);
        else if (!data.session) {
          setNotice("Check your email to confirm your account, then sign in.");
        }
      }
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Something went wrong.",
      );
    } finally {
      setBusy(false);
    }
  }

  const isSignIn = mode === "signin";

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-12">
      <Logo />
      <Card
        title={isSignIn ? "Sign in" : "Create your account"}
        description={
          isSignIn
            ? "Welcome back. Your profile and drafts are private to you."
            : "Your data stays private to your account."
        }
      >
        {DEV_BYPASS ? (
          <div className="space-y-3">
            <p role="status" className="rounded-md border border-warn/40 bg-warn/10 p-3 text-sm">
              Local development mode. Supabase is not used: you sign in as a
              test user and data is stored in a local file on the backend.
            </p>
            <Button className="w-full" onClick={devSignIn}>
              Continue as dev user
            </Button>
          </div>
        ) : configError ? (
          <p role="alert" className="text-sm text-err">
            {configError}
          </p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                autoComplete={isSignIn ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-err">
                {error}
              </p>
            )}
            {notice && (
              <p role="status" className="text-sm text-ok">
                {notice}
              </p>
            )}

            <Button type="submit" loading={busy} className="w-full">
              {isSignIn ? "Sign in" : "Create account"}
            </Button>
          </form>
        )}
      </Card>

      {!DEV_BYPASS && <Button
        variant="ghost"
        onClick={() => {
          setMode(isSignIn ? "signup" : "signin");
          setError(null);
          setNotice(null);
        }}
      >
        {isSignIn
          ? "New here? Create an account"
          : "Already have an account? Sign in"}
      </Button>}
    </main>
  );
}
