"use client";

import { useState } from "react";
import { FACES, PlaceyCharacter } from "@/components/placey/PlaceyCharacter";
import type { FaceName } from "@/components/placey/PlaceyCharacter";

const NAMES = Object.keys(FACES) as FaceName[];

/** Dev-only preview of the base character while Placey is being built. */
export default function PlaceyPreviewPage() {
  const [face, setFace] = useState<FaceName>("neutral");
  const [look, setLook] = useState(0);
  const [halo, setHalo] = useState(true);
  const [waving, setWaving] = useState(false);

  return (
    <main className="mx-auto max-w-4xl space-y-8 px-6 py-10">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-primary">Dev only</p>
        <h1 className="mt-1 text-3xl font-bold">Placey: base character</h1>
        <p className="mt-2 text-muted">Phase 2 preview. Accessories and modes come in the next phase.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-[320px_1fr]">
        <div className="panel flex items-center justify-center rounded-3xl p-6" style={{ background: "linear-gradient(160deg,#eef0ff,#f9e9f6)" }}>
          <PlaceyCharacter face={face} look={look} halo={halo} waving={waving} label="Placey" className="w-64" />
        </div>

        <div className="space-y-5">
          <div>
            <p className="mb-2 text-sm font-semibold">Face</p>
            <div className="flex flex-wrap gap-2">
              {NAMES.map((n) => (
                <button key={n} type="button" onClick={() => setFace(n)} className={`rounded-full border px-3 py-1 text-sm font-medium ${face === n ? "border-primary bg-primary text-on-primary" : "border-edge-strong"}`}>{n}</button>
              ))}
            </div>
          </div>
          <label className="block text-sm font-semibold">
            Look direction
            <input type="range" min={-1} max={1} step={0.1} value={look} onChange={(e) => setLook(Number(e.target.value))} className="mt-2 block w-full" />
          </label>
          <div className="flex gap-4 text-sm font-medium">
            <label className="flex items-center gap-2"><input type="checkbox" checked={halo} onChange={(e) => setHalo(e.target.checked)} /> Halo and sparkles</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={waving} onChange={(e) => setWaving(e.target.checked)} /> Waving</label>
          </div>
        </div>
      </div>
    </main>
  );
}
