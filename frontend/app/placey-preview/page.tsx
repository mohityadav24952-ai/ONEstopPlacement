"use client";

import { useState } from "react";
import { FACES, PlaceyCharacter } from "@/components/placey/PlaceyCharacter";
import type { FaceName } from "@/components/placey/PlaceyCharacter";
import { MODE_LABEL } from "@/components/placey/accessories";
import type { PlaceyMode } from "@/components/placey/accessories";

const MODES = Object.keys(MODE_LABEL) as PlaceyMode[];
const FACE_NAMES = Object.keys(FACES) as FaceName[];

const TINT: Record<PlaceyMode, string> = {
  classic: "linear-gradient(160deg,#e8ecff,#f6e8fb)",
  study: "linear-gradient(160deg,#e6f6ea,#eef6e2)",
  tech: "linear-gradient(160deg,#ffe9d6,#ffe1e6)",
  motivated: "linear-gradient(160deg,#ffe0ea,#ffe9f4)",
  hacker: "linear-gradient(160deg,#e9defd,#dcd6fb)",
  chill: "linear-gradient(160deg,#dfe9ff,#e9e6ff)",
  victory: "linear-gradient(160deg,#fff0cf,#ffe3d0)",
  resume: "linear-gradient(160deg,#eef0ff,#e8f3ff)",
  portfolio: "linear-gradient(160deg,#fde8f3,#fff0d8)",
};

/** Dev-only preview of Placey while it is being built. */
export default function PlaceyPreviewPage() {
  const [mode, setMode] = useState<PlaceyMode>("classic");
  const [face, setFace] = useState<FaceName | "auto">("auto");
  const [look, setLook] = useState(0);
  const [waving, setWaving] = useState(false);

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-6 py-10">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-primary">Dev only</p>
        <h1 className="mt-1 text-3xl font-bold">Placey: modes and wardrobe</h1>
        <p className="mt-2 text-muted">Phase 3 preview. The seven official modes plus two page variants (Resume, Portfolio).</p>
      </div>

      <div className="grid gap-6 md:grid-cols-[340px_1fr]">
        <div className="panel flex items-center justify-center rounded-3xl p-6" style={{ background: TINT[mode] }}>
          <PlaceyCharacter mode={mode} face={face === "auto" ? undefined : face} look={look} waving={waving} label={`Placey, ${MODE_LABEL[mode]}`} className="w-72" />
        </div>

        <div className="space-y-5">
          <div>
            <p className="mb-2 text-sm font-semibold">Mode</p>
            <div className="flex flex-wrap gap-2">
              {MODES.map((m) => (
                <button key={m} type="button" onClick={() => setMode(m)} className={`rounded-full border px-3 py-1 text-sm font-medium ${mode === m ? "border-primary bg-primary text-on-primary" : "border-edge-strong"}`}>{MODE_LABEL[m]}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold">Face (auto uses the mode&apos;s own)</p>
            <div className="flex flex-wrap gap-2">
              {(["auto", ...FACE_NAMES] as const).map((n) => (
                <button key={n} type="button" onClick={() => setFace(n)} className={`rounded-full border px-3 py-1 text-sm font-medium ${face === n ? "border-primary bg-primary text-on-primary" : "border-edge-strong"}`}>{n}</button>
              ))}
            </div>
          </div>
          <label className="block text-sm font-semibold">
            Look direction
            <input type="range" min={-1} max={1} step={0.1} value={look} onChange={(e) => setLook(Number(e.target.value))} className="mt-2 block w-full" />
          </label>
          <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={waving} onChange={(e) => setWaving(e.target.checked)} /> Waving</label>
        </div>
      </div>

      <section aria-label="All modes">
        <h2 className="mb-3 text-lg font-bold">All modes side by side</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {MODES.map((m) => (
            <button key={m} type="button" onClick={() => setMode(m)} className="panel rounded-2xl p-3 text-center transition-transform hover:-translate-y-0.5" style={{ background: TINT[m] }}>
              <PlaceyCharacter mode={m} className="mx-auto w-full max-w-[170px]" label={MODE_LABEL[m]} />
              <span className="mt-1 block text-sm font-semibold text-[#25295c]">{MODE_LABEL[m]}</span>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
