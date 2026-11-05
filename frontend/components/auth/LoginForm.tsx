"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Logo } from "@/components/shared/Logo";
import { useAuth } from "@/components/auth/AuthProvider";
import { FileText, GraduationCap, Globe, Code2 } from "lucide-react";
import { SiGithub, SiGoogle } from "react-icons/si";
import { exchangeOAuthCode, getSupabase } from "@/lib/auth/supabase";
import { DEV_BYPASS } from "@/lib/auth/dev";

type Mode = "signin" | "signup";

const inputClass = "field";

const FEATURES = [
  { icon: Code2, title: "Coding profile", text: "All your repositories and stats, with source and freshness." },
  { icon: FileText, title: "Honest resumes", text: "Tailored to a job using only facts you can back up." },
  { icon: GraduationCap, title: "Interview prep", text: "A day-by-day plan, every question labelled by origin." },
  { icon: Globe, title: "Portfolio site", text: "Preview, review what is public, export in one click." },
];

function BrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden border-r border-edge-strong hero-surface text-fg lg:flex lg:flex-col lg:justify-between lg:p-12">
      <div aria-hidden="true" className="dotgrid absolute inset-0 text-primary/15" />
      <div aria-hidden="true" className="absolute -right-16 -top-16 h-56 w-56 rounded-full border border-edge-strong bg-primary/20 text-primary" />
      <div aria-hidden="true" className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full border border-edge-strong bg-lavender" />
      <div className="relative"><Logo onDark /></div>
      <div className="relative">
        <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.2em] text-muted">Career copilot for students</p>
        <h2 className="font-display max-w-md text-5xl font-bold leading-[1.02] xl:text-6xl">
          Your placement journey, <span className="marker">in one place.</span>
        </h2>
        <ul className="mt-10 grid max-w-lg gap-3 sm:grid-cols-2">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <li key={f.title} className="rounded-2xl border border-edge-strong bg-surface p-4 text-ink shadow-pop">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-edge-strong bg-primary/20 text-primary">
                  <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                </span>
                <p className="mt-3 font-display text-lg font-semibold leading-tight">{f.title}</p>
                <p className="mt-0.5 text-sm leading-snug text-muted">{f.text}</p>
              </li>
            );
          })}
        </ul>
      </div>
      <p className="relative text-xs text-muted">Private by default. Nothing is published without your approval.</p>
    </aside>
  );
}

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

  // Coming back from Google/GitHub: the URL carries ?code=... (success) or ?error_description=... (failure or cancel).
  const [finishing, setFinishing] = useState(
    () => typeof window !== "undefined" && new URLSearchParams(window.location.search).has("code"),
  );
  useEffect(() => {
    const params = new URLSearchParams(window.location.search || window.location.hash.replace(/^#/, ""));
    const code = params.get("code");
    const message = params.get("error_description");
    if (!code) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (message) setError(message.replace(/\+/g, " "));
      return;
    }
    let active = true;
    setFinishing(true);
    void exchangeOAuthCode(code).then((failure) => {
      if (!active) return;
      window.history.replaceState(null, "", "/login"); // a used code must not stay in the address bar
      if (failure) {
        setError(failure);
        setFinishing(false);
      } else {
        router.replace("/");
      }
    });
    return () => {
      active = false;
    };
  }, [router]);

  async function onOAuth(provider: "google" | "github") {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const { error: authError } = await getSupabase().auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/login` },
      });
      // On success the browser leaves for the provider, so there is nothing more to do here.
      if (authError) {
        setError(authError.message);
        setBusy(false);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong.");
      setBusy(false);
    }
  }

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
    <main className="grid min-h-screen lg:grid-cols-2">
      <BrandPanel />
      <div className="flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md space-y-6">
      <div className="lg:hidden"><Logo /></div>
      <Card
        sticker
        eyebrow={isSignIn ? "Welcome back" : "Get started"}
        title={isSignIn ? "Sign in" : "Create your account"}
        description={
          isSignIn
            ? "Welcome back. Your profile and drafts are private to you."
            : "Your data stays private to your account."
        }
      >
        {finishing ? (
          <p role="status" className="text-sm text-muted">Finishing sign-in...</p>
        ) : DEV_BYPASS ? (
          <div className="space-y-3">
            <p role="status" className="rounded-xl border border-warn/40 bg-warn/10 p-3 text-sm">
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
          <div className="space-y-5">
          <div className="grid gap-2.5 sm:grid-cols-2">
            <Button type="button" variant="secondary" disabled={busy} onClick={() => onOAuth("google")} className="w-full">
              <SiGoogle className="h-4 w-4" aria-hidden="true" /> Continue with Google
            </Button>
            <Button type="button" variant="secondary" disabled={busy} onClick={() => onOAuth("github")} className="w-full">
              <SiGithub className="h-4 w-4" aria-hidden="true" /> Continue with GitHub
            </Button>
          </div>
          {error && (
            <p role="alert" className="text-sm text-err">
              {error}
            </p>
          )}
          <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-muted" aria-hidden="true">
            <span className="h-px flex-1 bg-edge" /> or use email <span className="h-px flex-1 bg-edge" />
          </div>
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

            {notice && (
              <p role="status" className="text-sm text-ok">
                {notice}
              </p>
            )}

            <Button type="submit" loading={busy} className="w-full">
              {isSignIn ? "Sign in" : "Create account"}
            </Button>
          </form>
          </div>
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
      </div>
      </div>
    </main>
  );
}
