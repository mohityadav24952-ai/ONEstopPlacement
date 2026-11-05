"use client";

import { useEffect, useState } from "react";
import { PlaceyCharacter } from "@/components/placey/PlaceyCharacter";
import { MODE_LABEL } from "@/components/placey/accessories";
import { PlaceyProvider, usePlacey } from "@/components/placey/PlaceyProvider";
import type { PlaceyEvent } from "@/components/placey/PlaceyProvider";
import { PLACEY_CONFIG } from "@/components/placey/controller";

const btn = "rounded-full border border-edge-strong px-3 py-1 text-sm font-medium hover:border-primary";

function Lab() {
  const { mode, pageMode, reason, emit, debug } = usePlacey();
  const [now, setNow] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, []);
  const fire = (e: PlaceyEvent, times = 1) => {
    for (let i = 0; i < times; i++) emit(e);
  };

  return (
    <div className="grid gap-6 md:grid-cols-[200px_1fr]">
      <div className="panel rounded-2xl p-3 text-center">
        <PlaceyCharacter mode={mode} className="mx-auto w-40" label={MODE_LABEL[mode]} />
        <p className="mt-1 text-sm font-bold">{MODE_LABEL[mode]}</p>
        <p className="text-xs text-muted">page: {pageMode}{reason ? ` · ${reason}` : ""}</p>
      </div>
      <div className="space-y-3">
        <p className="text-sm text-muted">
          Fires the same events the real screens emit. Motivated needs {PLACEY_CONFIG.questionsForMotivated} questions; reactions last{" "}
          {PLACEY_CONFIG.victoryMs / 1000}s, then Placey returns to the page&apos;s mode.
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btn} onClick={() => fire({ type: "question_done" })}>question done ×1</button>
          <button type="button" className={btn} onClick={() => fire({ type: "question_done" }, PLACEY_CONFIG.questionsForMotivated)}>question done ×{PLACEY_CONFIG.questionsForMotivated}</button>
          <button type="button" className={btn} onClick={() => fire({ type: "plan_complete" })}>plan complete</button>
          <button type="button" className={btn} onClick={() => fire({ type: "resume_approved" })}>resume approved</button>
          <button type="button" className={btn} onClick={() => fire({ type: "portfolio_approved" })}>portfolio approved</button>
          <button type="button" className={btn} onClick={() => fire({ type: "coding_action" })}>coding action</button>
        </div>
        <ul className="text-xs text-muted">
          <li>Active minutes this visit: {debug.activeMinutes} (Chill at {PLACEY_CONFIG.chillActiveMinutes})</li>
          <li>Minutes on Coding: {debug.codingMinutes} (Hacker needs {PLACEY_CONFIG.hackerCodingMinutes} and {PLACEY_CONFIG.hackerCodingActions} actions)</li>
          {debug.overrides.filter((o) => o.until > now).map((o) => (
            <li key={o.mode} className="font-semibold text-fg">
              {MODE_LABEL[o.mode]} active, {Math.max(0, Math.ceil((o.until - now) / 1000))}s left
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function ControllerLab() {
  return (
    <PlaceyProvider>
      <Lab />
    </PlaceyProvider>
  );
}
