"use client";

import { useCountUp } from "@/components/effects/useCountUp";

/**
 * Shows a display string, counting up its leading whole number (e.g. "72%", "3 / 5") when entrance
 * animations are on. Any string without a leading number is shown exactly as given.
 */
export function CountUpText({ value }: { value: string }) {
  const m = /^(\d{1,6})(\D[\s\S]*)?$/.exec(value);
  const n = m ? Number(m[1]) : 0;
  const shown = useCountUp(n);
  if (!m) return <>{value}</>;
  return (
    <>
      {shown}
      {m[2] ?? ""}
    </>
  );
}
