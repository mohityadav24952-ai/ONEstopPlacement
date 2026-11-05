"use client";

import { useState } from "react";
import { Copy, Download, Rocket } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useFeedback } from "@/components/ui/Feedback";
import { publicUrl } from "@/features/site-builder/lib/links";

/** The "push it live" options for a published portfolio. */
export function DeployCard({ handle, published }: { handle: string; published: boolean }) {
  const { toast } = useFeedback();
  const [busy, setBusy] = useState(false);
  const url = publicUrl(handle);

  async function download() {
    setBusy(true);
    try {
      const res = await fetch(`/api/site-export/${encodeURIComponent(handle)}`, { cache: "no-store" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Could not create the export.");
      }
      const blobUrl = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `${handle}-portfolio.zip`;
      a.click();
      URL.revokeObjectURL(blobUrl);
      toast("Static site downloaded. Unzip it and deploy the folder.");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not create the export.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      toast("Link copied.");
    } catch {
      toast(url, "info");
    }
  }

  return (
    <Card accent="mint" eyebrow="Go live" title="Deploy your portfolio" description="Two ways to put it on the internet.">
      {!published ? (
        <p className="text-sm text-muted">Publish your portfolio above first. An unpublished portfolio cannot be shared or exported.</p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          <section aria-labelledby="deploy-live" className="space-y-2">
            <h3 id="deploy-live" className="flex items-center gap-2 text-sm font-bold"><Rocket className="h-4 w-4 text-primary" aria-hidden="true" /> 1. Live from this app</h3>
            <p className="text-sm text-muted">Your page is served at the link below, with the mascot, theme toggle and every interactive feature. It is reachable by others once this app runs on a public address (not only on your own computer).</p>
            <div className="flex items-center gap-2">
              <input readOnly value={url} aria-label="Live link" onFocus={(e) => e.currentTarget.select()} className="field min-w-0 flex-1 !py-2 text-xs" />
              <Button size="sm" variant="secondary" onClick={() => void copy()}><Copy className="h-4 w-4" aria-hidden="true" /> Copy</Button>
            </div>
          </section>
          <section aria-labelledby="deploy-zip" className="space-y-2">
            <h3 id="deploy-zip" className="flex items-center gap-2 text-sm font-bold"><Download className="h-4 w-4 text-primary" aria-hidden="true" /> 2. Static site (ZIP)</h3>
            <p className="text-sm text-muted">A snapshot you can host anywhere: drag the unzipped folder onto Netlify Drop, run <code className="rounded bg-surface-2 px-1">vercel --prod</code> inside it, or push it to GitHub Pages. Layout and content are kept; interactive extras need the live app. Export again after you edit.</p>
            <Button size="sm" loading={busy} onClick={() => void download()}><Download className="h-4 w-4" aria-hidden="true" /> Download static site</Button>
          </section>
        </div>
      )}
    </Card>
  );
}
