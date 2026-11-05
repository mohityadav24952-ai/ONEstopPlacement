import type { PlaceyMode } from "@/components/placey/accessories";

/**
 * Which outfit Placey wears on each page by default. Activity-based overrides (Phase 7)
 * layer on top of this, and a mode the user picked by hand layers on top of both.
 */
const ROUTE_MODE: Array<[prefix: string, mode: PlaceyMode]> = [
  ["/coding", "tech"],
  ["/resume", "resume"],
  ["/prep", "study"],
  ["/portfolio", "portfolio"],
];

export function modeForRoute(pathname: string | null): PlaceyMode {
  if (!pathname) return "classic";
  for (const [prefix, mode] of ROUTE_MODE) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return mode;
  }
  // Home, Profile, Settings and anything unknown: calm Classic Dreamy
  return "classic";
}
