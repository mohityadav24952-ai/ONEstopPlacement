import { SiCodechef, SiCodingninjas, SiGeeksforgeeks, SiGithub, SiHackerrank, SiLeetcode } from "react-icons/si";
import type { IconType } from "react-icons";
import { cn } from "@/lib/cn";

export type PlatformKey = "GITHUB" | "LEETCODE" | "CODECHEF" | "HACKERRANK" | "GEEKSFORGEEKS" | "CODE360";

const CODING_PLATFORMS: PlatformKey[] = ["GITHUB", "LEETCODE", "CODECHEF", "HACKERRANK"];

/** Official logos (Simple Icons) and each brand's own colour. */
const BRAND: Record<PlatformKey, { Icon: IconType; color: string; label: string }> = {
  GITHUB: { Icon: SiGithub, color: "#181717", label: "GitHub" },
  LEETCODE: { Icon: SiLeetcode, color: "#FFA116", label: "LeetCode" },
  CODECHEF: { Icon: SiCodechef, color: "#5B4638", label: "CodeChef" },
  HACKERRANK: { Icon: SiHackerrank, color: "#00EA64", label: "HackerRank" },
  GEEKSFORGEEKS: { Icon: SiGeeksforgeeks, color: "#2F8D46", label: "GeeksforGeeks" },
  CODE360: { Icon: SiCodingninjas, color: "#F96D00", label: "Naukri Code360" },
};

type Props = {
  platform: PlatformKey;
  /** Edge length of the tile in px. The logo fills about 60% of it. */
  size?: number;
  /** Plain logo in its brand colour, with no tile behind it. */
  bare?: boolean;
  className?: string;
};

/**
 * A platform logo. By default it sits on a light tile so every brand colour stays legible and
 * recognisable in all three themes (CodeChef brown and GitHub black would vanish on dark ones).
 */
export function PlatformIcon({ platform, size = 40, bare = false, className }: Props) {
  const { Icon, color, label } = BRAND[platform];
  if (bare) return <Icon aria-label={label} role="img" size={size} color={color} className={className} />;
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center rounded-xl border border-black/10 bg-white shadow-card", className)}
      style={{ width: size, height: size }}
    >
      <Icon aria-label={label} role="img" size={Math.round(size * 0.58)} color={color} />
    </span>
  );
}

/** A row of the four logos, e.g. "works with". */
export function PlatformIconRow({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      {CODING_PLATFORMS.map((k) => (
        <PlatformIcon key={k} platform={k} size={size} />
      ))}
    </span>
  );
}
