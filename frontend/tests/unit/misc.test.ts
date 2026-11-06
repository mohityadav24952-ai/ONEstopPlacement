import { describe, expect, it } from "vitest";
import { techIcon } from "@/features/site-builder/lib/techIcons";
import { computeStreak, dayKey } from "@/lib/streak";

describe("techIcon", () => {
  it("finds logos however the resume spells the technology", () => {
    for (const name of ["Node.js", "NodeJS", "node", "React.js", "Next.js", "C++", "Tailwind CSS", "Socket.io", "Google Maps API"]) {
      expect(techIcon(name), name).toBeDefined();
    }
    expect(techIcon("Node.js")).toBe(techIcon("nodejs"));
  });

  it("returns nothing for unknown names (the badge shows text only)", () => {
    expect(techIcon("Monaco Editor")).toBeUndefined();
    expect(techIcon("")).toBeUndefined();
  });
});

describe("computeStreak", () => {
  it("counts consecutive days ending today", () => {
    expect(computeStreak(["2026-11-04", "2026-11-05", "2026-11-06"], "2026-11-06")).toEqual(
      { current: 3, longest: 3, activeToday: true, atRisk: false, totalDays: 3 });
  });

  it("keeps a streak alive but at risk until something happens today", () => {
    const s = computeStreak(["2026-11-04", "2026-11-05"], "2026-11-06");
    expect([s.current, s.atRisk, s.activeToday]).toEqual([2, true, false]);
  });

  it("breaks after a missed day, remembers the longest run and crosses month ends", () => {
    const s = computeStreak(["2026-10-30", "2026-10-31", "2026-11-01", "2026-11-03", "2026-11-03"], "2026-11-06");
    expect([s.current, s.longest, s.totalDays]).toEqual([0, 3, 4]);
  });

  it("uses the local calendar day", () => {
    expect(dayKey(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });
});
