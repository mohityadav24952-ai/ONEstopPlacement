/**
 * LOCAL DEVELOPMENT ONLY. Lets you use the app without Supabase.
 * Needs NEXT_PUBLIC_DEV_AUTH_BYPASS=true and is always off in production builds.
 * The backend must also run with DEV_AUTH_BYPASS=true (it accepts this fixed token).
 */
export const DEV_BYPASS =
  process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === "true" &&
  process.env.NODE_ENV !== "production";

export const DEV_TOKEN = "dev-token";
export const DEV_EMAIL = "dev@example.com";
const KEY = "dev-auth-signed-in";

export function isDevSignedIn(): boolean {
  if (!DEV_BYPASS) return false;
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function setDevSignedIn(value: boolean): void {
  try {
    if (value) localStorage.setItem(KEY, "1");
    else localStorage.removeItem(KEY);
  } catch {
    // storage unavailable: the session simply will not persist
  }
}
