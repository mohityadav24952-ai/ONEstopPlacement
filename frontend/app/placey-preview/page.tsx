"use client";

import { useState } from "react";
import Link from "next/link";
import { FACES, PlaceyCharacter } from "@/components/placey/PlaceyCharacter";
import type { FaceName } from "@/components/placey/PlaceyCharacter";
import { PlaceyActor } from "@/components/placey/PlaceyActor";
import { usePlaceyIdle, usePlaceyMotion } from "@/components/placey/motion";
import type { MotionName } from "@/components/placey/motion";
import { MODE_LABEL } from "@/components/placey/accessories";
import { PlaceySpeechBubble } from "@/components/placey/PlaceySpeechBubble";
import { QUOTES } from "@/components/placey/quotes";
import type { PlaceyMode } from "@/components/placey/accessories";
import { ControllerLab } from "./ControllerLab";
import { resetPrefs } from "@/components/placey/prefs";

const MODES = Object.keys(MODE_LABEL) as PlaceyMode[];
const FACE_NAMES = Object.keys(FACES) as FaceName[];
const MOTIONS: MotionName[] = ["enter", "wave", "hop", "jump", "celebrate", "tilt", "nod", "bounce", "think"];
const RUN_RANGE: [number, number] = [-120, 120];

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

const pill = (on: boolean) =>
  `rounded-full border px-3 py-1 text-sm font-medium ${on ? "border-primary bg-primary text-on-primary" : "border-edge-strong"}`;

/** Dev-only preview and animation lab for Placey. */
export default function PlaceyPreviewPage() {
  const [mode, setMode] = useState<PlaceyMode>("classic");
  const [face, setFace] = useState<FaceName | "auto">("auto");
  const [offscreen, setOffscreen] = useState(false);
  const [idle, setIdle] = useState(false);
  const [movement, setMovement] = useState(true);
  const m = usePlaceyMotion();
  usePlaceyIdle(m, { enabled: idle, movement, range: RUN_RANGE });

  function replayEntrance() {
    m.cancel();
    setOffscreen(true);
    window.setTimeout(() => {
      setOffscreen(false);
      m.play("enter");
    }, 60);
  }

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-6 py-10">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-primary">Dev only</p>
        <h1 className="mt-1 text-3xl font-bold">Placey: animation lab</h1>
        <p className="mt-2 text-muted">Phase 4/5 preview. Motions queue so they never overlap. Pick a mode, then fire motions below.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[460px_1fr]">
        <div className="panel relative flex h-[380px] items-end justify-center overflow-hidden rounded-3xl pb-6" style={{ background: TINT[mode] }}>
          <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-10 bg-white/40" />
          <PlaceyActor mode={mode} motion={m} face={face === "auto" ? undefined : face} offscreen={offscreen} className="relative w-56" label={`Placey, ${MODE_LABEL[mode]}`} />
        </div>

        <div className="space-y-5">
          <div>
            <p className="mb-2 text-sm font-semibold">Mode</p>
            <div className="flex flex-wrap gap-2">
              {MODES.map((x) => (
                <button key={x} type="button" onClick={() => setMode(x)} className={pill(mode === x)}>{MODE_LABEL[x]}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold">Motions (queued, never overlapping)</p>
            <div className="flex flex-wrap gap-2">
              {MOTIONS.map((x) => (
                <button key={x} type="button" onClick={() => (x === "enter" ? replayEntrance() : m.play(x))} className={pill(false)}>{x}</button>
              ))}
              <button type="button" onClick={() => m.runTo(-110)} className={pill(false)}>run left</button>
              <button type="button" onClick={() => m.runTo(110)} className={pill(false)}>run right</button>
              <button type="button" onClick={() => m.runTo(0)} className={pill(false)}>return</button>
              <button type="button" onClick={() => m.play("wave", "jump", { run: 90 }, "hop", { run: 0 }, "nod")} className={pill(false)}>sequence</button>
              <button type="button" onClick={() => m.cancel()} className={pill(false)}>stop</button>
            </div>
          </div>
          <div className="flex flex-wrap gap-5 text-sm font-medium">
            <label className="flex items-center gap-2"><input type="checkbox" checked={idle} onChange={(e) => setIdle(e.target.checked)} /> Idle behaviour (look, hop, tilt, run)</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={movement} onChange={(e) => setMovement(e.target.checked)} /> Allow tiny runs</label>
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold">Face override</p>
            <div className="flex flex-wrap gap-2">
              {(["auto", ...FACE_NAMES] as const).map((n) => (
                <button key={n} type="button" onClick={() => setFace(n)} className={pill(face === n)}>{n}</button>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-edge p-3 text-sm">
            <p className="font-semibold">First-visit introduction</p>
            <p className="mt-0.5 text-xs text-muted">Forget the saved intro and greeting state, then open Home to watch it play from the start.</p>
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={() => resetPrefs()} className={pill(false)}>Reset intro</button>
              <Link href="/" className={pill(false)}>Open Home</Link>
            </div>
          </div>
          <p className="text-xs text-muted">
            Now playing: <span className="font-semibold">{m.running ? "tiny run" : (m.motion ?? "idle")}</span>
            {m.reduced && " (reduced motion is on, so motions are skipped)"}
          </p>
        </div>
      </div>

      <section aria-label="Controller test">
        <h2 className="mb-3 text-lg font-bold">Controller test (events, priority, expiry)</h2>
        <ControllerLab />
      </section>

      <section aria-label="Speech bubbles">
        <h2 className="mb-3 text-lg font-bold">Speech bubbles, one per mood</h2>
        <div className="flex flex-wrap gap-x-6 gap-y-5 rounded-2xl border border-edge p-5" style={{ background: "linear-gradient(160deg,#f6f4ff,#fdf1f8)" }}>
          {(["classic", "study", "tech", "motivated", "hacker", "chill", "victory"] as PlaceyMode[]).map((x) => (
            <PlaceySpeechBubble key={x} inline mode={x} text={QUOTES[x][0]} />
          ))}
        </div>
      </section>

      <section aria-label="All modes">
        <h2 className="mb-3 text-lg font-bold">All modes side by side</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {MODES.map((x) => (
            <button key={x} type="button" onClick={() => setMode(x)} className="panel rounded-2xl p-3 text-center transition-transform hover:-translate-y-0.5" style={{ background: TINT[x] }}>
              <PlaceyCharacter mode={x} className="mx-auto w-full max-w-[170px]" label={MODE_LABEL[x]} />
              <span className="mt-1 block text-sm font-semibold text-[#25295c]">{MODE_LABEL[x]}</span>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
