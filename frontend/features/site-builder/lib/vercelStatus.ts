import type { VercelState } from "@/lib/api/site";

/** What the deploy panel is doing: uploading the site, following Vercel's build, or finished. */
export type DeployPhase = "idle" | "uploading" | "polling" | "live" | "failed" | "timeout";

export const DEPLOY_STEPS = ["Initializing", "Building", "Live"] as const;

/** Index into DEPLOY_STEPS for the current phase and Vercel state. */
export function stepOf(phase: DeployPhase, state: VercelState | undefined): number {
  if (phase === "live") return 2;
  if (phase === "uploading" || !state || state === "queued" || state === "initializing") return 0;
  return 1; // building, finalizing (built, address being assigned)
}

/** The one-line status shown under the steps ("" when there is nothing to say). */
export function statusText(phase: DeployPhase, state: VercelState | undefined): string {
  if (phase === "uploading") return "Initializing… uploading your site to Vercel.";
  if (phase === "polling") {
    if (state === "finalizing") return "Building… assigning your web address.";
    return stepOf(phase, state) === 0 ? "Initializing… waiting for Vercel to start." : "Building… Vercel is preparing your site.";
  }
  if (phase === "live") return "Live! Your portfolio is on the internet.";
  return "";
}

/** The message for a deployment Vercel finished without going live. */
export function failureText(state: VercelState, error?: string): string {
  if (error) return error;
  return state === "canceled" ? "The deployment was canceled." : "Vercel could not build the site.";
}
