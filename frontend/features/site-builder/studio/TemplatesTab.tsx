"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Eye, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { PortfolioConfig, PortfolioData, TemplateId } from "@/types/portfolio";
import { TEMPLATES, TemplateRenderer } from "@/features/site-builder/templates";
import { defaultPortfolioData } from "@/features/site-builder/data/defaultPortfolioData";
import { cn } from "@/lib/cn";

type Props = { data: PortfolioData; onConfig: (partial: Partial<PortfolioConfig>) => Promise<void> };

/** Small CSS miniatures that show each template's look without rendering the real thing. */
function Thumb({ id }: { id: TemplateId }) {
  const bar = (w: string, c: string, h = "h-1.5") => <span className={cn("block rounded-full", h)} style={{ width: w, background: c }} />;
  switch (id) {
    case "blueprint":
      return (
        <div className="relative h-full w-full overflow-hidden rounded-lg border border-sky-400/30 bg-[#060b16] p-3" style={{ backgroundImage: "linear-gradient(rgba(56,189,248,.12) 1px,transparent 1px),linear-gradient(90deg,rgba(56,189,248,.12) 1px,transparent 1px)", backgroundSize: "16px 16px" }}>
          <div className="flex gap-2"><div className="w-2/5 space-y-1.5">{bar("90%", "#38bdf8", "h-2")}{bar("70%", "#334155")}{bar("55%", "#334155")}</div>
            <div className="grid flex-1 grid-cols-2 gap-1.5">{["1623", "460+", "1380", "28"].map((n) => <span key={n} className="rounded border border-sky-400/40 px-1 py-1 text-center font-mono text-[10px] text-sky-300">{n}</span>)}</div></div>
          <div className="mt-3 grid grid-cols-2 gap-2">{[0, 1].map((i) => <span key={i} className="h-10 rounded border border-sky-400/30 bg-sky-400/5" />)}</div>
        </div>
      );
    case "devos":
      return (
        <div className="h-full w-full overflow-hidden rounded-lg bg-gradient-to-br from-indigo-700 via-purple-700 to-sky-600 p-2.5">
          <div className="h-2 rounded bg-white/25" />
          <div className="mx-auto mt-2 h-[70%] w-[85%] rounded-lg border border-white/20 bg-[#0d1117]/90 p-1.5">
            <div className="mb-1.5 flex gap-1">{["#ff5f57", "#febc2e", "#28c840"].map((c) => <span key={c} className="h-1.5 w-1.5 rounded-full" style={{ background: c }} />)}</div>
            <div className="space-y-1">{bar("60%", "#7dd3fc")}{bar("80%", "#475569")}{bar("45%", "#a78bfa")}</div>
          </div>
        </div>
      );
    case "neural-bento":
      return (
        <div className="grid h-full w-full grid-cols-3 grid-rows-2 gap-1.5 overflow-hidden rounded-lg bg-[#050508] p-2.5">
          <span className="col-span-2 rounded-md border border-white/10 bg-[#0c0d12] p-1.5">{bar("55%", "#10b981", "h-2")}</span>
          <span className="rounded-md border border-white/10 bg-[#0c0d12]" />
          <span className="rounded-md border border-white/10 bg-[#0c0d12]" />
          <span className="col-span-2 rounded-md border border-emerald-400/40 bg-[#0c0d12]" />
        </div>
      );
    case "devsearch":
      return (
        <div className="h-full w-full overflow-hidden rounded-lg bg-white p-2.5">
          <div className="flex items-center gap-1.5"><span className="text-[10px] font-bold text-blue-600">Dev<span className="text-red-500">Search</span></span><span className="h-3.5 flex-1 rounded-full border border-slate-300" /></div>
          <div className="mt-2 flex gap-2"><div className="flex-1 space-y-1.5">{[0, 1, 2].map((i) => <div key={i} className="space-y-0.5">{bar("40%", "#16a34a")}{bar("70%", "#1a0dab")}{bar("90%", "#cbd5e1")}</div>)}</div>
            <span className="h-14 w-1/3 rounded border border-slate-300" /></div>
        </div>
      );
    case "neon-3d":
      return (
        <div className="relative h-full w-full overflow-hidden rounded-lg bg-black p-3" style={{ backgroundImage: "radial-gradient(60% 60% at 78% 40%,rgba(168,85,247,.35),transparent 70%)" }}>
          <div className="flex items-center justify-between"><span className="text-[9px] font-black text-white">SK</span><span className="flex items-center gap-1 rounded-full border border-white/15 px-1.5 text-[7px] text-zinc-300"><span className="h-1 w-1 rounded-full bg-green-500" />Available</span></div>
          <div className="mt-2 flex items-center gap-2"><div className="flex-1 space-y-1"><span className="block text-[15px] font-black uppercase leading-none text-white">Hi, I&apos;m</span><span className="block bg-gradient-to-r from-purple-500 via-pink-500 to-fuchsia-300 bg-clip-text text-[15px] font-black uppercase leading-none text-transparent">Dev</span><span className="mt-1.5 inline-block rounded-full border border-pink-500 px-2 py-0.5 text-[7px] font-bold text-white shadow-[0_0_10px_rgba(236,72,153,.6)]">CONTACT ME</span></div>
            <span className="h-14 w-14 rounded-full shadow-[0_10px_30px_-6px_rgba(168,85,247,.8)]" style={{ background: "radial-gradient(circle at 32% 28%,#fff,#c084fc 30%,#7e22ce 60%,#09090b)" }} /></div>
          <div className="absolute inset-x-0 bottom-2 overflow-hidden whitespace-nowrap border-y border-white/10 py-0.5 text-[8px] font-extrabold uppercase text-zinc-300">React ✦ Next.js ✦ TypeScript ✦ MongoDB ✦ AWS ✦ Java</div>
        </div>
      );
    default:
      return (
        <div className="h-full w-full overflow-hidden rounded-lg border-2 border-black bg-[#f4f0ea] p-2">
          <div className="mb-1.5 h-2 border-y-2 border-black bg-yellow-300" />
          <div className="flex gap-2"><div className="flex-1 space-y-1.5"><span className="block h-3 w-4/5 bg-black" /><span className="block h-1.5 w-2/3 bg-black/40" /><span className="inline-block h-3 w-10 border-2 border-black bg-emerald-300 shadow-[2px_2px_0_#000]" /></div>
            <span className="h-14 w-1/3 border-2 border-black bg-white shadow-[3px_3px_0_#000]" /></div>
        </div>
      );
  }
}

function PreviewModal({ data, id, onClose, onApply }: { data: PortfolioData; id: TemplateId; onClose: () => void; onApply: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const hasContent = data.basics.fullName || data.projects.length > 0;
  const shown: PortfolioData = hasContent ? { ...data, config: { ...data.config, templateId: id } } : { ...defaultPortfolioData, config: { ...data.config, templateId: id } };
  const name = TEMPLATES.find((t) => t.id === id)?.name;
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/70 p-3 sm:p-6">
      <div role="dialog" aria-modal="true" aria-label={`${name} preview`} className="sticker mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-3xl">
        <header className="flex flex-wrap items-center gap-3 border-b border-edge-strong p-3">
          <h2 className="font-display text-lg font-bold">{name}</h2>
          {!hasContent && <span className="rounded-full bg-warn/20 px-3 py-0.5 text-xs font-bold text-warn">Sample data: yours will appear once you add it</span>}
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" onClick={onApply}>Apply Template</Button>
            <button ref={closeRef} type="button" onClick={onClose} aria-label="Close preview" className="rounded-md p-1.5 text-muted hover:text-fg"><X className="h-5 w-5" aria-hidden="true" /></button>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-auto bg-white">
          <TemplateRenderer data={shown} isPreview />
        </div>
      </div>
    </div>
  );
}

export function TemplatesTab({ data, onConfig }: Props) {
  const [preview, setPreview] = useState<TemplateId | null>(null);
  const [applying, setApplying] = useState<TemplateId | null>(null);
  const current = data.config.templateId;

  async function apply(id: TemplateId) {
    setApplying(id);
    try {
      await onConfig({ templateId: id });
      setPreview(null);
    } finally {
      setApplying(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-3xl font-bold">Explore Templates.</h2>
        <p className="mt-1 text-sm text-muted">Find the perfect design for your portfolio. Preview themes and apply them instantly. Your data is never lost when you switch.</p>
      </div>
      <ul className="grid gap-5 md:grid-cols-2">
        {TEMPLATES.map((t) => {
          const active = current === t.id;
          return (
            <li key={t.id} className={cn("panel animate-in overflow-hidden rounded-3xl transition-all hover:-translate-y-0.5", active && "border-primary shadow-pop")}>
              <div className="h-44 p-3"><Thumb id={t.id} /></div>
              <div className="space-y-3 p-5 pt-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-xl font-bold">{t.name}</h3>
                  {t.badge && <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-[11px] font-bold text-primary">{t.badge === "Recommended" ? "★ Recommended" : "Popular pick"}</span>}
                  {active && <span className="inline-flex items-center gap-1 rounded-full bg-ok/15 px-2.5 py-0.5 text-[11px] font-bold text-ok"><Check className="h-3 w-3" aria-hidden="true" /> In use</span>}
                </div>
                <p className="text-sm text-muted">{t.tagline}</p>
                <ul aria-label="Best for" className="flex flex-wrap gap-1.5">
                  {t.roles.map((r) => <li key={r} className="rounded-full border border-edge-strong px-2.5 py-0.5 text-[11px] font-bold">{r}</li>)}
                </ul>
                <div className="flex gap-2 pt-1">
                  <Button variant="secondary" size="sm" onClick={() => setPreview(t.id)}><Eye className="h-4 w-4" aria-hidden="true" /> Preview</Button>
                  <Button size="sm" disabled={active} loading={applying === t.id} onClick={() => void apply(t.id)}>{active ? "Applied" : "Apply Template"}</Button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {preview && <PreviewModal data={data} id={preview} onClose={() => setPreview(null)} onApply={() => void apply(preview)} />}
    </div>
  );
}
