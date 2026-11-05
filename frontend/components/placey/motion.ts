"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Placey's animation scheduler.
 *
 * One-shot motions never overlap: they go into a queue and play one after another, so
 * "enter > wave > jump > hop" always reads as one smooth sequence. Durations are timers (not
 * animationend events) so the queue also works under prefers-reduced-motion, where every motion
 * collapses to zero length and movement is skipped.
 */

export type MotionName = "enter" | "wave" | "hop" | "jump" | "celebrate" | "tilt" | "nod" | "bounce" | "think";

export const MOTION_MS: Record<MotionName, number> = {
  enter: 1150,
  wave: 1500,
  hop: 620,
  jump: 760,
  celebrate: 1700,
  tilt: 1000,
  nod: 850,
  bounce: 1000,
  think: 2000,
};

type Item = MotionName | { run: number };

export type PlaceyMotion = {
  /** The one-shot motion currently playing, or null when idle. */
  motion: MotionName | null;
  /** Horizontal offset from the resting spot, in px. */
  x: number;
  flip: boolean;
  running: boolean;
  runMs: number;
  /** Pupil direction, -1..1. */
  look: number;
  waving: boolean;
  /** True while a queued motion is playing. */
  busy: boolean;
  reduced: boolean;
  /** Queue motions to play in order (after anything already playing). */
  play: (...items: Array<MotionName | { run: number }>) => void;
  /** Queue a short run to an absolute x offset. */
  runTo: (x: number) => void;
  setLook: (v: number) => void;
  /** Drop the queue and stop at once. */
  cancel: () => void;
  isBusy: () => boolean;
  getX: () => number;
};

function prefersReduced(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

export function usePlaceyMotion(): PlaceyMotion {
  const [motion, setMotion] = useState<MotionName | null>(null);
  const [x, setX] = useState(0);
  const [flip, setFlip] = useState(false);
  const [running, setRunning] = useState(false);
  const [runMs, setRunMs] = useState(0);
  const [look, setLookState] = useState(0);
  const [waving, setWaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reduced, setReduced] = useState(false);

  const queue = useRef<Item[]>([]);
  const timer = useRef<number | null>(null);
  const playing = useRef(false);
  const xRef = useRef(0);
  const reducedRef = useRef(false);
  const nextRef = useRef<() => void>(() => {});
  const advance = useCallback(() => nextRef.current(), []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      reducedRef.current = mq.matches;
      setReduced(mq.matches);
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const finish = useCallback(() => {
    setMotion(null);
    setRunning(false);
    setWaving(false);
    setLookState(0);
    setFlip(false);
  }, []);

  const next = useCallback(() => {
    const item = queue.current.shift();
    if (item === undefined) {
      playing.current = false;
      setBusy(false);
      finish();
      return;
    }
    playing.current = true;
    setBusy(true);
    const reduce = reducedRef.current || prefersReduced();

    if (typeof item === "object") {
      // tiny run: move, hopping as we go
      if (reduce) {
        timer.current = window.setTimeout(advance, 0);
        return;
      }
      const dist = Math.abs(item.run - xRef.current);
      const ms = Math.max(450, Math.round(dist * 7));
      setMotion(null);
      setFlip(item.run < xRef.current);
      setRunMs(ms);
      setRunning(true);
      xRef.current = item.run;
      setX(item.run);
      timer.current = window.setTimeout(() => {
        setRunning(false);
        setFlip(false);
        advance();
      }, ms);
      return;
    }

    setRunning(false);
    setMotion(item);
    if (item === "wave") setWaving(true);
    if (item === "think") setLookState(0.9);
    timer.current = window.setTimeout(
      () => {
        setWaving(false);
        setLookState(0);
        setMotion(null);
        advance();
      },
      reduce ? 0 : MOTION_MS[item],
    );
  }, [finish, advance]);

  useEffect(() => {
    nextRef.current = next;
  }, [next]);

  const play = useCallback(
    (...items: Item[]) => {
      queue.current.push(...items);
      if (!playing.current) next();
    },
    [next],
  );

  const runTo = useCallback((target: number) => play({ run: target }), [play]);

  const cancel = useCallback(() => {
    queue.current = [];
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    playing.current = false;
    setBusy(false);
    finish();
  }, [finish]);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  return {
    motion,
    x,
    flip,
    running,
    runMs,
    look,
    waving,
    busy,
    reduced,
    play,
    runTo,
    setLook: setLookState,
    cancel,
    isBusy: () => playing.current,
    getX: () => xRef.current,
  };
}

type IdleOptions = {
  enabled: boolean;
  /** Allow tiny runs along the bottom. Hops and looks still happen when false. */
  movement: boolean;
  /** Allowed x range for runs, relative to the resting spot. */
  range?: [number, number];
};

/**
 * Occasional, low-key life: look around, a hop, a head tilt, now and then a tiny run and back.
 * Pauses while the tab is hidden, while another motion plays, and when disabled.
 */
export function usePlaceyIdle(m: PlaceyMotion, { enabled, movement, range = [-90, 0] }: IdleOptions): void {
  const mRef = useRef(m);
  useEffect(() => {
    mRef.current = m;
  });

  useEffect(() => {
    if (!enabled) return;
    let t: number | undefined;
    let lookT: number | undefined;

    const tick = () => {
      const cur = mRef.current;
      if (document.hidden || cur.isBusy() || cur.reduced) {
        t = window.setTimeout(tick, 3000);
        return;
      }
      const r = Math.random();
      if (r < 0.4) {
        const dir = Math.random() < 0.5 ? -1 : 1;
        cur.setLook(dir);
        lookT = window.setTimeout(() => cur.setLook(0), 1400);
      } else if (r < 0.6) {
        cur.play("hop");
      } else if (r < 0.75) {
        cur.play("tilt");
      } else if (movement) {
        const here = cur.getX();
        const lo = range[0];
        const hi = range[1];
        const step = 40 + Math.random() * 50;
        const target = Math.min(hi, Math.max(lo, here + (Math.random() < 0.5 ? -step : step)));
        if (Math.abs(target - here) > 20) cur.play({ run: target }, "hop");
        else cur.play("hop");
      } else {
        cur.play("nod");
      }
      t = window.setTimeout(tick, 5000 + Math.random() * 5000);
    };

    t = window.setTimeout(tick, 4000 + Math.random() * 3000);
    return () => {
      if (t !== undefined) window.clearTimeout(t);
      if (lookT !== undefined) window.clearTimeout(lookT);
    };
  }, [enabled, movement, range]);
}
