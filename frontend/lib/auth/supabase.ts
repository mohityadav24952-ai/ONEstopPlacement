import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DEV_BYPASS, DEV_TOKEN, isDevSignedIn } from "@/lib/auth/dev";

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Sign-in is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in frontend/.env.local, then restart npm run dev.",
    );
  }

  // PKCE: the browser gets a one-time code in the URL, never a token, and exchanges it for a session.
  // detectSessionInUrl is off on purpose: the login page exchanges the code itself (see
  // exchangeOAuthCode), so there is exactly one exchange and a failure is shown, not swallowed.
  client = createClient(url, key, { auth: { flowType: "pkce", detectSessionInUrl: false } });
  return client;
}

export async function getAccessToken(): Promise<string | null> {
  if (DEV_BYPASS) return isDevSignedIn() ? DEV_TOKEN : null;
  try {
    const { data } = await getSupabase().auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

const exchanges = new Map<string, Promise<string | null>>();

/**
 * Completes an OAuth sign-in: trades the one-time ?code= for a session. A code works once, and React
 * strict mode runs effects twice in development, so concurrent calls with the same code share one
 * request. Resolves to an error message, or null on success.
 */
export function exchangeOAuthCode(code: string): Promise<string | null> {
  let pending = exchanges.get(code);
  if (!pending) {
    pending = getSupabase()
      .auth.exchangeCodeForSession(code)
      .then(({ error }) => (error ? error.message : null))
      .catch((err: unknown) => (err instanceof Error ? err.message : "Could not complete sign-in."));
    exchanges.set(code, pending);
  }
  return pending;
}
