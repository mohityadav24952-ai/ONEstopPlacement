"use client";

import { useState } from "react";
import { ExternalLink, Globe, Lock, Monitor, Moon, Share2, Smartphone, Sun } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { PortfolioConfig, PortfolioData } from "@/types/portfolio";
import { TemplateRenderer } from "@/features/site-builder/templates";
import { ShareModal } from "@/features/site-builder/studio/ShareModal";
import { DeployCard } from "@/features/site-builder/studio/DeployCard";
import { publicUrl } from "@/features/site-builder/lib/links";
import { cn } from "@/lib/cn";

type Props = {
  data: PortfolioData;
  onConfig: (partial: Partial<PortfolioConfig>) => Promise<void>;
};

export function DashboardTab({ data, onConfig }: Props) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [share, setShare] = useState(false);
  const [busy, setBusy] = useState(false);
  const { handle, isPublished, themeMode } = data.config;
  const url = publicUrl(handle);

  async function setPublished(value: boolean) {
    setBusy(true);
    try {
      await onConfig({ isPublished: value });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 pb-24">
      <div className={cn("flex flex-wrap items-center gap-3 rounded-2xl border p-3.5", isPublished ? "border-ok/40 bg-ok/10" : "border-warn/40 bg-warn/10")}>
        {isPublished ? <Globe className="h-5 w-5 text-ok" aria-hidden="true" /> : <Lock className="h-5 w-5 text-warn" aria-hidden="true" />}
        <p className="min-w-0 flex-1 text-sm">
          {isPublished ? (
            <>Live at <span className="font-bold">/p/{handle}</span>. Anyone with the link can see it, including your email address. Your phone number is never shown.</>
          ) : (
            <><span className="font-bold">Private.</span> Only you can see this preview. Publish when you have reviewed every section.</>
          )}
        </p>
        <Button size="sm" variant={isPublished ? "secondary" : "primary"} loading={busy} onClick={() => void setPublished(!isPublished)}>
          {isPublished ? "Unpublish" : "Publish"}
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Preview size" className="inline-flex rounded-full border border-edge-strong p-1">
          {([["desktop", "Desktop", Monitor], ["mobile", "Mobile", Smartphone]] as const).map(([id, label, Icon]) => (
            <button key={id} type="button" aria-pressed={device === id} onClick={() => setDevice(id)}
              className={cn("inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-bold transition-colors", device === id ? "bg-primary text-on-primary" : "text-muted hover:text-fg")}>
              <Icon className="h-4 w-4" aria-hidden="true" /> {label}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => void onConfig({ themeMode: themeMode === "dark" ? "light" : "dark" })}
          className="inline-flex items-center gap-2 rounded-full border border-edge-strong px-3.5 py-1.5 text-sm font-bold hover:border-primary">
          {themeMode === "dark" ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
          {themeMode === "dark" ? "Light" : "Dark"} preview
        </button>
      </div>

      {/* The template scrolls inside this frame. It never uses position: fixed, so the mascot and dock stay inside it. */}
      <div className="overflow-hidden rounded-3xl border border-edge-strong bg-surface-2 p-2 shadow-pop sm:p-3">
        <div className={cn("mx-auto h-[72vh] min-h-[480px] overflow-auto rounded-2xl border border-edge bg-white transition-[max-width] duration-300", device === "mobile" ? "max-w-[390px]" : "max-w-full")}
          role="region" aria-label="Portfolio preview" tabIndex={0}>
          <TemplateRenderer data={data} isPreview />
        </div>
      </div>

      <DeployCard handle={handle} published={isPublished} />

      <div className="sticky bottom-4 z-30 flex justify-center">
        <div className="sticker flex items-center gap-2 rounded-full p-1.5">
          <Button variant="secondary" className="!rounded-full" onClick={() => setShare(true)}><Share2 className="h-4 w-4" aria-hidden="true" /> Share</Button>
          {isPublished ? (
            <a href={`/p/${handle}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-app transition-opacity hover:opacity-90">
              View Live <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          ) : (
            <span title="Publish first to make the live page available" className="inline-flex h-10 cursor-not-allowed items-center gap-2 rounded-full bg-ink/40 px-5 text-sm font-semibold text-app" aria-disabled="true">
              View Live <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </span>
          )}
        </div>
      </div>

      {share && <ShareModal url={url} name={data.basics.fullName} onClose={() => setShare(false)} />}
    </div>
  );
}
