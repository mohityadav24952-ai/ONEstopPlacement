import {
  Code2,
  FileText,
  Globe,
  GraduationCap,
  LayoutDashboard,
  Settings,
  User,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
};

export const primaryNav: NavItem[] = [
  { href: "/", label: "Home", shortLabel: "Home", icon: LayoutDashboard },
  {
    href: "/coding",
    label: "Coding Dashboard",
    shortLabel: "Coding",
    icon: Code2,
  },
  {
    href: "/resume",
    label: "Resume Studio",
    shortLabel: "Resume",
    icon: FileText,
  },
  {
    href: "/prep",
    label: "Interview Prep",
    shortLabel: "Prep",
    icon: GraduationCap,
  },
  {
    href: "/portfolio-site",
    label: "Portfolio Website",
    shortLabel: "Website",
    icon: Globe,
  },
];

export const secondaryNav: NavItem[] = [
  { href: "/profile", label: "Profile", shortLabel: "Profile", icon: User },
  {
    href: "/settings",
    label: "Settings",
    shortLabel: "Settings",
    icon: Settings,
  },
];

export function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function titleFor(pathname: string): string {
  const all = [...primaryNav, ...secondaryNav];
  const match = all.find((item) => isActive(pathname, item.href));
  return match ? match.label : "ONEstopPlacement";
}