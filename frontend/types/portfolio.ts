/** Portfolio Site Builder data contract. Mirrors backend/app/modules/site_builder/schemas.py (camelCase). */
export type TemplateId = "blueprint" | "devos" | "neural-bento" | "devsearch" | "shiplog";
export type MascotId = "cyber-alien" | "voxel-bot" | "coder-cat" | "ai-orb" | "terminal-dino" | "none";
export type ThemeMode = "dark" | "light";
export type AccentColor = "emerald" | "cyan" | "violet" | "amber" | "rose";

export interface PortfolioConfig {
  handle: string;
  templateId: TemplateId;
  themeMode: ThemeMode;
  mascotId: MascotId;
  accentColor: AccentColor;
  isPublished: boolean;
  showCodingStats: boolean;
  showMascot: boolean;
}

export interface CodingProfileStats {
  leetcode?: {
    username: string;
    profileUrl: string;
    totalSolved: number;
    easySolved: number;
    mediumSolved: number;
    hardSolved: number;
    rating?: number;
    globalRank?: number;
    topPercentage?: number;
  };
  codechef?: {
    username: string;
    profileUrl: string;
    rating: number;
    maxRating: number;
    stars: string; // e.g. "3★"
    globalRank?: number;
  };
  codeforces?: {
    username: string;
    profileUrl: string;
    rating: number;
    maxRating: number;
    rank: string; // e.g. "Specialist"
  };
  github?: {
    username: string;
    profileUrl: string;
    publicRepos: number;
    followers: number;
    totalStars: number;
    topLanguages: string[];
    avatarUrl?: string;
  };
}

export interface PortfolioProject {
  id: string;
  title: string;
  tagline: string;
  description: string;
  techStack: string[];
  githubUrl?: string;
  liveUrl?: string;
  imageUrl?: string;
  featured: boolean;
  metrics?: string;
  year?: string;
}

export interface PortfolioExperience {
  id: string;
  role: string;
  company: string;
  companyUrl?: string;
  location: string;
  startDate: string;
  endDate: string;
  descriptionBullets: string[];
  techUsed: string[];
}

export interface PortfolioEducation {
  id: string;
  degree: string;
  institution: string;
  location: string;
  startYear: string;
  endYear: string;
  score?: string;
  highlights?: string[];
}

export interface PortfolioAchievement {
  id: string;
  title: string;
  issuer: string;
  date?: string;
  description: string;
  proofUrl?: string;
}

export interface PortfolioBasics {
  fullName: string;
  headline: string;
  shortBio: string;
  longBio: string;
  email: string;
  phone?: string;
  location: string;
  avatarUrl?: string;
  resumeUrl?: string;
  availabilityText: string;
  socials: {
    github?: string;
    linkedin?: string;
    twitter?: string;
    leetcode?: string;
    codechef?: string;
    codeforces?: string;
    website?: string;
  };
}

export interface PortfolioSkills {
  languages: string[];
  frameworks: string[];
  databasesAndCloud: string[];
  aiAndMl: string[];
  coreCsAndTools: string[];
}

export interface PortfolioData {
  config: PortfolioConfig;
  basics: PortfolioBasics;
  codingStats: CodingProfileStats;
  skills: PortfolioSkills;
  projects: PortfolioProject[];
  experience: PortfolioExperience[];
  education: PortfolioEducation[];
  achievements: PortfolioAchievement[];
}

/** Props every template receives. */
export interface TemplateProps {
  data: PortfolioData;
  /** True inside the Studio preview frame (links still work; nothing is tracked). */
  isPreview?: boolean;
  onUpdateConfig?: (partial: Partial<PortfolioConfig>) => void;
}
