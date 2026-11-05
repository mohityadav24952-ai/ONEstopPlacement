import type { PortfolioData } from "@/types/portfolio";

/**
 * SAMPLE data for previews and the public `demo` page. It is not a real person's verified record:
 * the demo page is labelled as a sample. Real portfolios start empty (from the user's own profile).
 */
export const defaultPortfolioData: PortfolioData = {
  config: {
    handle: "flyingmohit",
    templateId: "blueprint",
    themeMode: "dark",
    mascotId: "cyber-alien",
    accentColor: "emerald",
    isPublished: true,
    showCodingStats: true,
    showMascot: true,
  },
  basics: {
    fullName: "Mohit Sharma",
    headline: "Full-Stack & Agentic AI Engineer | Competitive Programmer",
    shortBio:
      "Building multi-agent AI architectures, browser-based developer tools, and scalable distributed backends. 3★ on CodeChef (1623) & 450+ DSA problems solved.",
    longBio:
      "I build products end to end: typed React front ends, Python services, and the AI plumbing between them. I like hard constraints (latency budgets, flaky networks, tiny teams) and I practise competitive programming to keep my fundamentals sharp.",
    email: "mohit@example.com",
    location: "Dehradun, India",
    availabilityText: "Available for 2026 SDE Internships & Full-Time Roles",
    resumeUrl: "https://example.com/resume.pdf",
    socials: {
      github: "https://github.com/flyingmohit",
      linkedin: "https://www.linkedin.com/in/flyingmohit",
      twitter: "https://x.com/flyingmohit",
      leetcode: "https://leetcode.com/u/flyingmohit/",
      codechef: "https://www.codechef.com/users/flyingmohit",
      codeforces: "https://codeforces.com/profile/flyingmohit",
      website: "https://flyingmohit.dev",
    },
  },
  codingStats: {
    codechef: { username: "flyingmohit", profileUrl: "https://www.codechef.com/users/flyingmohit", rating: 1623, maxRating: 1623, stars: "3★", globalRank: 12450 },
    leetcode: {
      username: "flyingmohit",
      profileUrl: "https://leetcode.com/u/flyingmohit/",
      totalSolved: 460,
      easySolved: 165,
      mediumSolved: 235,
      hardSolved: 60,
      rating: 1740,
      topPercentage: 9.8,
    },
    codeforces: { username: "flyingmohit", profileUrl: "https://codeforces.com/profile/flyingmohit", rating: 1380, maxRating: 1410, rank: "Specialist" },
    github: {
      username: "flyingmohit",
      profileUrl: "https://github.com/flyingmohit",
      publicRepos: 28,
      followers: 64,
      totalStars: 142,
      topLanguages: ["TypeScript", "Python", "C++", "Next.js", "FastAPI"],
    },
  },
  skills: {
    languages: ["TypeScript", "Python", "C++", "SQL", "JavaScript"],
    frameworks: ["Next.js", "React", "FastAPI", "Node.js", "Tailwind CSS"],
    databasesAndCloud: ["PostgreSQL", "Redis", "Prisma", "Docker", "Supabase"],
    aiAndMl: ["LangGraph", "RAG", "Vector DBs", "Ollama", "Prompt Evaluation"],
    coreCsAndTools: ["Data Structures", "Algorithms", "OS", "DBMS", "Git", "Linux"],
  },
  projects: [
    {
      id: "p1",
      title: "ONEstopPlacement — Multi-Agent AI Career Copilot",
      tagline: "Autonomous Orchestrator-based Placement & Portfolio Engine",
      description:
        "Engineered a multi-agent AI system featuring specialized Portfolio, Resume Optimization, Mock Interview, and Profile Intelligence agents using LangGraph, FastAPI, Next.js, and Vector RAG.",
      techStack: ["Next.js", "FastAPI", "LangGraph", "Python", "TypeScript", "Vector DB", "Tailwind CSS"],
      githubUrl: "https://github.com/flyingmohit/onestopplacement",
      liveUrl: "https://example.com/onestopplacement",
      featured: true,
      metrics: "4 Autonomous AI Agents | Real-Time Profile Enrichment",
      year: "2026",
    },
    {
      id: "p2",
      title: "CodeForge AI — Browser-Based Web IDE with AI Code Assistant",
      tagline: "Cloud-free in-browser Node.js IDE powered by WebContainers & Local LLMs",
      description:
        "Engineered in-browser Node.js execution with WebContainers, an xterm.js terminal, and live preview; integrated Ollama (CodeLlama) for cursor-context inline completion and AI review/fix/optimize chat. Implemented NextAuth Google/GitHub authentication, Prisma/SQLite persistence, and a Zustand multi-tab file tree.",
      techStack: ["Next.js", "React", "TypeScript", "WebContainers", "Monaco Editor", "Ollama", "Prisma", "Tailwind CSS"],
      githubUrl: "https://github.com/flyingmohit/codeforge-ai",
      featured: true,
      metrics: "Zero-Latency In-Browser Execution | Multi-Tab AST File Tree",
      year: "2025",
    },
    {
      id: "p3",
      title: "Distributed Rate-Limiter & API Gateway Engine",
      tagline: "High-throughput token-bucket & sliding-window middleware",
      description:
        "Built a fault-tolerant API gateway in Python and Redis supporting distributed rate-limiting, circuit breaking, and real-time Prometheus/Grafana telemetry.",
      techStack: ["Python", "FastAPI", "Redis", "Docker", "Prometheus", "C++"],
      githubUrl: "https://github.com/flyingmohit/rate-limiter",
      featured: false,
      metrics: "10,000+ Req/Sec | <2ms Overhead",
      year: "2025",
    },
  ],
  experience: [
    {
      id: "e1",
      role: "Software Engineering Intern",
      company: "Example Labs",
      location: "Remote",
      startDate: "Jun 2025",
      endDate: "Aug 2025",
      descriptionBullets: [
        "Built a typed API client and caching layer that cut dashboard load time for internal tools.",
        "Wrote integration tests for payment webhooks and fixed three production race conditions.",
      ],
      techUsed: ["TypeScript", "Node.js", "PostgreSQL"],
    },
  ],
  education: [
    {
      id: "ed1",
      degree: "B.Tech, Computer Science & Engineering",
      institution: "Graphic Era University",
      location: "Dehradun, India",
      startYear: "2024",
      endYear: "2028",
      score: "CGPA: 8.7/10",
      highlights: ["Core coursework: Data Structures, Operating Systems, DBMS, Computer Networks"],
    },
  ],
  achievements: [
    { id: "a1", title: "3★ on CodeChef", issuer: "CodeChef", date: "2025", description: "Reached a 1623 rating in rated contests." },
    { id: "a2", title: "450+ problems solved", issuer: "LeetCode", date: "2026", description: "Consistent practice across arrays, graphs, DP and system design." },
  ],
};

/** Empty portfolio shell used by the studio while loading and by tests. */
export function emptyPortfolio(handle: string): PortfolioData {
  return {
    config: { ...defaultPortfolioData.config, handle, isPublished: false },
    basics: { fullName: "", headline: "", shortBio: "", longBio: "", email: "", location: "", availabilityText: "", socials: {} },
    codingStats: {},
    skills: { languages: [], frameworks: [], databasesAndCloud: [], aiAndMl: [], coreCsAndTools: [] },
    projects: [],
    experience: [],
    education: [],
    achievements: [],
  };
}
