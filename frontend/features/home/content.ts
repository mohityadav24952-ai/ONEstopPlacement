import { Code2, FileText, Globe, GraduationCap } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type ModuleInfo = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

export const modules: ModuleInfo[] = [
  {
    href: "/coding",
    title: "Coding Dashboard",
    description:
      "See your GitHub, LeetCode, CodeChef and HackerRank activity with its source and last-updated time.",
    icon: Code2,
  },
  {
    href: "/resume",
    title: "Resume Studio",
    description:
      "Tailor your resume to a job description. Every claim stays backed by evidence you approve.",
    icon: FileText,
  },
  {
    href: "/prep",
    title: "Interview Prep",
    description:
      "Build a preparation plan for a company and role, with the source of each question shown.",
    icon: GraduationCap,
  },
  {
    href: "/portfolio",
    title: "Portfolio Builder",
    description:
      "Turn your approved profile and projects into a website you can preview and export.",
    icon: Globe,
  },
];

export type NextStep = {
  title: string;
  description: string;
  href: string;
  cta: string;
};

export const nextSteps: NextStep[] = [
  {
    title: "Complete your profile",
    description:
      "Add your education, skills and projects. Every module reuses them.",
    href: "/profile",
    cta: "Open profile",
  },
  {
    title: "Connect a coding platform",
    description: "Start with GitHub. You can enter other platforms manually.",
    href: "/coding",
    cta: "Open coding dashboard",
  },
  {
    title: "Upload your resume",
    description:
      "We extract the details and you review them before anything is saved.",
    href: "/resume",
    cta: "Open resume studio",
  },
];
