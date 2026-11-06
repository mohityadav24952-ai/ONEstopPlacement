"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Check, CloudUpload, ExternalLink, Loader2, RotateCcw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { describeError } from "@/lib/api/errors";
import { deployToVercel, getVercelDeployment } from "@/lib/api/site";
import type { VercelDeployment } from "@/lib/api/site";
import { DEPLOY_STEPS as STEPS, failureText, statusText as statusFor, stepOf } from "@/features/site-builder/lib/vercelStatus";
import type { DeployPhase as Phase } from "@/features/site-builder/lib/vercelStatus";

const POLL_MS = 2500;
const GIVE_UP_MS = 5 * 60 * 1000; // a static site normally goes live in well under a minute
const MAX_POLL_FAILURES = 3;

const storageKey = (handle: string) => `osp-vercel-url:${handle}`;

function readStored(handle: string): string | null {
  try {
    return window.localStorage.getItem(storageKey(handle));
  } catch {
    return null; // storage blocked: we just won't remember the last link
  }
}

function subscribeStorage(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

/** "3. 1-Click Vercel Deployment": upload the published site, then follow the build until it is live. */
export function VercelDeploy({ handle }: { handle: string }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [deployment, setDeployment] = useState<VercelDeployment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [justDeployed, setJustDeployed] = useState<string | null>(null);
  const stored = useSyncExternalStore(subscribeStorage, () => readStored(handle), () => null);
  const lastUrl = justDeployed ?? stored;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [handle]);

  function remember(url: string) {
    setJustDeployed(url);
    try {
      window.localStorage.setItem(storageKey(handle), url);
    } catch {
      /* ignore */
    }
  }

  function poll(id: string, startedAt: number, failures: number) {
    timer.current = setTimeout(async () => {
      if (!alive.current) return;
      try {
        const d = await getVercelDeployment(id);
        if (!alive.current) return;
        setDeployment(d);
        if (d.state === "ready" && d.url) {
          setPhase("live");
          remember(d.url);
          return;
        }
        if (d.done) {
          setPhase("failed");
          setError(failureText(d.state, d.error));
          return;
        }
        if (Date.now() - startedAt > GIVE_UP_MS) {
          setPhase("timeout");
          return;
        }
        poll(id, startedAt, 0);
      } catch (err) {
        if (!alive.current) return;
        if (failures + 1 >= MAX_POLL_FAILURES) {
          setPhase("failed");
          setError(`Lost track of the deployment: ${describeError(err)}`);
          return;
        }
        poll(id, startedAt, failures + 1); // a blip: try again on the next tick
      }
    }, POLL_MS);
  }

  async function start() {
    if (timer.current) clearTimeout(timer.current);
    setPhase("uploading");
    setError(null);
    setDeployment(null);
    try {
      const d = await deployToVercel();
      if (!alive.current) return;
      setDeployment(d);
      setPhase("polling");
      poll(d.id, Date.now(), 0);
    } catch (err) {
      if (!alive.current) return;
      setPhase("failed");
      setError(describeError(err));
    }
  }

  const busy = phase === "uploading" || phase === "polling";
  const current = stepOf(phase, deployment?.state);
  const statusText = statusFor(phase, deployment?.state);

  return (
    <section aria-labelledby="deploy-vercel" className="space-y-3 border-t border-edge pt-5 lg:col-span-2">
      <h3 id="deploy-vercel" className="flex items-center gap-2 text-sm font-bold">
        <CloudUpload className="h-4 w-4 text-primary" aria-hidden="true" /> 3. 1-Click Vercel Deployment
      </h3>
      <p className="text-sm text-muted">
        Publishes the same static snapshot as the ZIP to a free <code className="rounded bg-surface-2 px-1">.vercel.app</code> address,
        without installing anything. Deploy again after you edit to update it.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" loading={busy} disabled={busy} onClick={() => void start()}>
          {phase === "live" || phase === "failed" || phase === "timeout" ? (
            <>
              <RotateCcw className="h-4 w-4" aria-hidden="true" /> Deploy again
            </>
          ) : (
            <>
              <CloudUpload className="h-4 w-4" aria-hidden="true" /> Deploy to Vercel
            </>
          )}
        </Button>
        {phase === "idle" && lastUrl && (
          <a href={lastUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
            Last deployment: {lastUrl.replace(/^https:\/\//, "")} <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        )}
      </div>

      {phase !== "idle" && phase !== "failed" && phase !== "timeout" && (
        <ol className="flex flex-wrap items-center gap-2 text-xs font-semibold" aria-label="Deployment progress">
          {STEPS.map((label, i) => {
            const done = i < current || phase === "live";
            const active = i === current && phase !== "live";
            return (
              <li key={label} className="flex items-center gap-2" aria-current={active ? "step" : undefined}>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${
                    done ? "border-ok/40 bg-ok/10 text-ok" : active ? "border-primary/50 bg-primary/10 text-primary" : "border-edge text-muted"
                  }`}
                >
                  {done ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : active ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
                  {label}
                </span>
                {i < STEPS.length - 1 && <span aria-hidden="true" className="h-px w-4 bg-edge" />}
              </li>
            );
          })}
        </ol>
      )}

      <div aria-live="polite" className="space-y-2 text-sm">
        {statusText && <p className={phase === "live" ? "font-semibold text-ok" : "text-muted"}>{statusText}</p>}
        {phase === "live" && deployment?.url && (
          <a
            href={deployment.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex max-w-full items-center gap-1.5 break-all rounded-lg border border-ok/40 bg-ok/10 px-3 py-2 font-semibold text-ok hover:underline"
          >
            {deployment.url.replace(/^https:\/\//, "")} <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
          </a>
        )}
        {phase === "timeout" && (
          <p className="text-muted">
            Vercel is taking longer than usual. The build may still finish; deploy again in a minute if the link does not appear.
          </p>
        )}
        {phase === "failed" && error && (
          <p role="alert" className="flex items-start gap-2 text-err">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {error}
          </p>
        )}
      </div>
    </section>
  );
}
