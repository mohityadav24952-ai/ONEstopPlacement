import { describe, expect, it } from "vitest";
import { DEPLOY_STEPS, failureText, statusText, stepOf } from "@/features/site-builder/lib/vercelStatus";

describe("Vercel deploy progress", () => {
  it("maps every Vercel state onto Initializing -> Building -> Live", () => {
    expect(DEPLOY_STEPS).toEqual(["Initializing", "Building", "Live"]);
    expect(stepOf("uploading", undefined)).toBe(0);
    expect(stepOf("polling", "queued")).toBe(0);
    expect(stepOf("polling", "initializing")).toBe(0);
    expect(stepOf("polling", "building")).toBe(1);
    expect(stepOf("polling", "finalizing")).toBe(1);
    expect(stepOf("live", "ready")).toBe(2);
  });

  it("says what is happening in plain words", () => {
    expect(statusText("uploading", undefined)).toMatch(/^Initializing… uploading/);
    expect(statusText("polling", "queued")).toMatch(/^Initializing…/);
    expect(statusText("polling", "building")).toMatch(/^Building…/);
    expect(statusText("polling", "finalizing")).toMatch(/web address/);
    expect(statusText("live", "ready")).toMatch(/^Live!/);
    expect(statusText("idle", undefined)).toBe("");
    expect(statusText("failed", "error")).toBe("");
  });

  it("prefers Vercel's own error message", () => {
    expect(failureText("error", "Build failed: out of memory")).toBe("Build failed: out of memory");
    expect(failureText("canceled")).toMatch(/canceled/);
    expect(failureText("error")).toMatch(/could not build/);
  });
});
