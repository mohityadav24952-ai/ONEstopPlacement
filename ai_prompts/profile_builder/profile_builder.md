# ONEstopPlacement — Autonomous Portfolio Builder Engine (Master Execution Spec)

## 0. CRITICAL OPERATING DIRECTIVES FOR CLAUDE CLI (READ FIRST)

1. **STRICT MODULE ISOLATION (DO NOT BREAK EXISTING PROJECT):**
   - You are working inside the `OneStopPlacement` monorepo (`backend/` with FastAPI + SQLAlchemy/Alembic + `dev.db`/PostgreSQL, and `frontend/` with Next.js App Router + Tailwind CSS + Framer Motion + Lucide Icons).
   - **NEVER MODIFY, DELETE, OR BREAK** any unrelated modules: Resume/Optimization Agent, Interview Agent, Profile Intelligence Agent, Placey Mascot core, Auth system, or existing database tables unrelated to the Portfolio/Profile Builder.
   - **REPLACE ONLY THE PORTFOLIO MODULE:** Locate any existing partial/broken Portfolio Builder files in `backend/app/` and `frontend/src/` (or `frontend/app/`), clean them up, and build the complete, production-grade Portfolio Builder Engine from scratch according to this specification.

2. **UNLIMITED ENTERPRISE TOKEN BUDGET — ZERO PLACEHOLDERS ALLOWED:**
   - Do NOT use `// TODO`, `// Add remaining code here`, `// Similar to above`, or stubbed components.
   - Every single one of the **5 Tech Templates**, **5 Interactive Animated SVG Mascots**, **Light/Dark Dual-Theme Engines**, **FastAPI Live Profile Scrapers (LeetCode, CodeChef, Codeforces, GitHub, Microlink Screenshot Engine)**, **Database Models**, and **Dashboard Views (`Dashboard`, `Edit Data`, `Customize`, `Templates`, `Claim Handle`, and `/p/[handle]` Live Route)** must be 100% completely coded, deeply styled, and interactive.

3. **AUTONOMOUS SELF-HEALING & VERIFICATION LOOP:**
   - Also notice if there are any SQLite/DB connection lock issues or Alembic migration needs in `backend/` — handle database sessions cleanly using existing `backend/app` dependency injection patterns.
   - After implementing both Backend and Frontend, run Python syntax/import checks, TypeScript checks (`npx tsc --noEmit`), and Next.js build verification. Fix every single error autonomously before finishing.

---

## 1. END-TO-END PRODUCT ARCHITECTURE & USER FLOW

We are building an instant, AI-powered Developer Portfolio Website Generator & Hosting Engine (inspired by `itsfolio.tech`, upgraded specifically for Software Engineers, Competitive Programmers, AI Engineers, and Full-Stack Builders).

### Complete User Journey:
1. **Step 1: Claim Unique Handle (`ClaimHandleView`):**
   - User sees a sleek, centered onboarding card: **"Claim your handle."** with subtitle *"This will be your unique portfolio link."*
   - Input field displays live domain preview: `{handle}.onestop.tech` (and local route `/p/{handle}`).
   - Real-time debounced (300ms) check against `GET /api/portfolio/check-handle?handle={slug}`:
     - If taken (e.g., `mohit`): Show red validation text `"This username is already taken."` and disable button.
     - If available (e.g., `flyingmohit`): Show green validation text `"✓ Looks good!"` and enable the `"Claim Handle"` button once the Terms & Privacy Policy checkbox is ticked.
2. **Step 2: One-Click Resume PDF Upload + AI Parsing + Live Profile Scraping:**
   - User uploads their Resume PDF (or pulls data from their existing ONEstopPlacement profile/resume).
   - **Hyperlink-Aware PDF Parser:** Backend extracts both visible text AND hidden PDF annotation hyperlinks (`URI` links attached to words like "GitHub", "Live Demo", "LeetCode", "CodeChef").
   - **LLM Structured Extraction:** Converts raw resume text + extracted URLs into our strict `PortfolioData` JSON schema.
   - **Automated Live Profile & Project Enrichment:**
     - Queries **LeetCode GraphQL API** for live solved counts (Total, Easy, Medium, Hard), Contest Rating, and Global Rank.
     - Queries **GitHub REST API** for public repo count, followers, total stars, top languages, and repo descriptions.
     - Queries **Codeforces Public API** for live rating, max rating, and rank title.
     - Scrapes **CodeChef Public Profile** for current rating, max rating, and star badge (e.g., `3★`, `1623`).
     - Generates **Live Project Screenshots** automatically for every project that has a `liveUrl` (via Microlink Screenshot API `https://api.microlink.io/?url={encoded_url}&screenshot=true&meta=false&embed=screenshot.url`) or `githubUrl` (via GitHub OpenGraph preview `https://opengraph.githubassets.com/1/{owner}/{repo}`).
3. **Step 3: Choose Template (`TemplateSelectorView`):**
   - Full visual gallery titled **"Explore Templates." / "Choose your template."**
   - Displays our **5 Pure Tech Templates** (`Blueprint`, `DevOS`, `Neural Bento`, `DevSearch`, `ShipLog Brutalist`) with high-craft interactive preview cards, target role tags (`Software Engineers`, `Competitive Programmers`, `AI Engineers`, `Indie Builders`), `"Recommended"` / `"Trending"` pills, and instant one-click `"Apply Template"`.
4. **Step 4: Portfolio Studio Dashboard (`PortfolioDashboard`):**
   - Top Navigation Bar with 4 tabs:
     - **`Dashboard`**: Renders a full interactive preview of the user's portfolio inside a sleek frame, accompanied by a floating bottom action bar containing **`Share`** (copies live URL + opens QR Code & Social Share modal) and **`View Live ↗`** (opens `/p/{handle}` in a new browser tab).
     - **`Edit Data`**: Complete visual CMS editor allowing the user to edit Basics, Socials, Coding Handles (with a `"Sync Live Stats Now"` button), Projects (add/edit/delete/reorder + custom image URL or auto-screenshot), Experience, Skills, Education, and Achievements, plus a `"Re-upload Resume PDF"` button.
     - **`Customize`**: Switch default Theme (`Dark Mode` vs `Light Mode`), choose from **5 Interactive Animated Mascots** (`Cyber-Alien`, `Voxel-Bot`, `Coder-Cat`, `AI-Orb`, `Terminal-Dino`, or `None`), select Accent Color (`emerald`, `cyan`, `violet`, `amber`, `rose`), and toggle section visibility.
     - **`Templates`**: Switch between any of the 5 templates at any time with zero data loss.
5. **Step 5: Instant Public Live Deployment (`/p/[handle]` & Subdomain Middleware):**
   - Visiting `/p/{handle}` (or `{handle}.localhost:3000` / `{handle}.yourdomain.com`) renders the standalone, SEO-ready, ultra-fast public portfolio website with visitor controls for Light/Dark mode, interactive Mascot, and one-click Resume PDF download.

---

## 2. UNIFIED DATA CONTRACT (STRICT SCHEMA FOR BACKEND & FRONTEND)

Create `frontend/src/types/portfolio.ts` (or matching path in `frontend/`) and corresponding Pydantic schemas in `backend/app/schemas/portfolio.py`:

```typescript
export type TemplateId = 'blueprint' | 'devos' | 'neural-bento' | 'devsearch' | 'shiplog';
export type MascotId = 'cyber-alien' | 'voxel-bot' | 'coder-cat' | 'ai-orb' | 'terminal-dino' | 'none';
export type ThemeMode = 'dark' | 'light';
export type AccentColor = 'emerald' | 'cyan' | 'violet' | 'amber' | 'rose';

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
    stars: string; // e.g., "3★"
    globalRank?: number;
  };
  codeforces?: {
    username: string;
    profileUrl: string;
    rating: number;
    maxRating: number;
    rank: string; // e.g., "Specialist", "Expert", "Pupil"
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
  metrics?: string; // e.g., "Multi-Agent RAG | Sub-100ms Latency"
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
  score?: string; // e.g., "CGPA: 8.7/10"
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

export interface PortfolioData {
  config: PortfolioConfig;
  basics: {
    fullName: string;
    headline: string;
    shortBio: string;
    longBio: string;
    email: string;
    phone?: string;
    location: string;
    avatarUrl?: string;
    resumeUrl?: string;
    availabilityText: string; // e.g., "Available for 2026 SDE Internships & Full-Time Roles"
    socials: {
      github?: string;
      linkedin?: string;
      twitter?: string;
      leetcode?: string;
      codechef?: string;
      codeforces?: string;
      website?: string;
    };
  };
  codingStats: CodingProfileStats;
  skills: {
    languages: string[];
    frameworks: string[];
    databasesAndCloud: string[];
    aiAndMl: string[];
    coreCsAndTools: string[];
  };
  projects: PortfolioProject[];
  experience: PortfolioExperience[];
  education: PortfolioEducation[];
  achievements: PortfolioAchievement[];
}
```

---

## 3. DEFAULT FALLBACK / DEMO DATASET (`defaultPortfolioData.ts`)

Create a rich, realistic default dataset so any user (or preview screen) immediately renders a jaw-dropping portfolio even before uploading a resume:
- **Name:** `"Mohit Sharma"` (or dynamic from logged-in user profile)
- **Handle:** `"flyingmohit"`
- **Headline:** `"Full-Stack & Agentic AI Engineer | Competitive Programmer"`
- **Short Bio:** `"Building multi-agent AI architectures, browser-based developer tools, and scalable distributed backends. 3★ on CodeChef (1623) & 450+ DSA problems solved."`
- **Coding Stats:**
  - **CodeChef:** `username: "flyingmohit"`, `rating: 1623`, `maxRating: 1623`, `stars: "3★"`, `globalRank: 12450`
  - **LeetCode:** `username: "flyingmohit"`, `totalSolved: 460`, `easySolved: 165`, `mediumSolved: 235`, `hardSolved: 60`, `rating: 1740`, `topPercentage: 9.8`
  - **Codeforces:** `username: "flyingmohit"`, `rating: 1380`, `maxRating: 1410`, `rank: "Specialist"`
  - **GitHub:** `username: "flyingmohit"`, `publicRepos: 28`, `followers: 64`, `totalStars: 142`, `topLanguages: ["TypeScript", "Python", "C++", "Next.js", "FastAPI"]`
- **Featured Projects (Pre-populated):**
  1. **`ONEstopPlacement — Multi-Agent AI Career Copilot`**
     - *Tagline:* `"Autonomous Orchestrator-based Placement & Portfolio Engine"`
     - *Description:* `"Engineered a multi-agent AI system featuring specialized Portfolio, Resume Optimization, Mock Interview, and Profile Intelligence agents using LangGraph, FastAPI, Next.js, and Vector RAG."`
     - *Tech Stack:* `["Next.js", "FastAPI", "LangGraph", "Python", "TypeScript", "Vector DB", "Tailwind CSS"]`
     - *Metrics:* `"4 Autonomous AI Agents | Real-Time Profile Enrichment"`
  2. **`CodeForge AI — Browser-Based Web IDE with AI Code Assistant`**
     - *Tagline:* `"Cloud-free in-browser Node.js IDE powered by WebContainers & Local LLMs"`
     - *Description:* `"Engineered in-browser Node.js execution with WebContainers, an xterm.js terminal, and live preview; integrated Ollama (CodeLlama) for cursor-context inline completion and AI review/fix/optimize chat. Implemented NextAuth Google/GitHub authentication, Prisma/SQLite persistence, and a Zustand multi-tab file tree."`
     - *Tech Stack:* `["Next.js", "React", "TypeScript", "WebContainers", "Monaco Editor", "Ollama", "Prisma", "Tailwind CSS"]`
     - *Metrics:* `"Zero-Latency In-Browser Execution | Multi-Tab AST File Tree"`
  3. **`Distributed Rate-Limiter & API Gateway Engine`**
     - *Tagline:* `"High-throughput token-bucket & sliding-window middleware"`
     - *Description:* `"Built a fault-tolerant API gateway in Python and Redis supporting distributed rate-limiting, circuit breaking, and real-time Prometheus/Grafana telemetry."`
     - *Tech Stack:* `["Python", "FastAPI", "Redis", "Docker", "Prometheus", "C++"]`
     - *Metrics:* `"10,000+ Req/Sec | <2ms Overhead"`

---

## 4. BACKEND IMPLEMENTATION (`backend/app/`)

Inspect `backend/app/` to follow the existing project's database session (`get_db`), User authentication dependency (`get_current_user` or optional auth fallback), and router registration in `main.py`.

### 4.1 Database Model (`backend/app/models/portfolio.py`)
Create SQLAlchemy model `UserPortfolio`:
- `id`: Integer / UUID Primary Key
- `user_id`: String / Integer (ForeignKey or indexed user identifier, nullable=True for guest/demo mode so testing never fails)
- `handle`: String(50), unique=True, index=True, nullable=False
- `template_id`: String(30), default=`"blueprint"`
- `theme_mode`: String(15), default=`"dark"`
- `mascot_id`: String(30), default=`"cyber-alien"`
- `accent_color`: String(20), default=`"emerald"`
- `portfolio_data`: JSON / Text (serialized `PortfolioData` JSON)
- `is_published`: Boolean, default=`True`
- `views_count`: Integer, default=`0`
- `created_at`, `updated_at`: DateTime
- Ensure `Base.metadata.create_all(bind=engine)` or Alembic migration runs cleanly so the table is guaranteed to exist in `dev.db` / PostgreSQL without manual intervention.

### 4.2 Live Coding Profile & Project Enrichment Service (`backend/app/services/portfolio_enrichment.py`)
Implement an asynchronous service using `httpx.AsyncClient(timeout=6.0)` that safely fetches live data and never crashes if a 3rd-party API is slow or rate-limited:

1. **`fetch_leetcode_stats(username: str)`:**
   - POST to `https://leetcode.com/graphql` with query:
     ```graphql
     query userPublicProfile($username: String!) {
       matchedUser(username: $username) {
         submitStats: submitStatsGlobal {
           acSubmissionNum { difficulty count }
         }
       }
       userContestRanking(username: $username) {
         rating
         globalRanking
         topPercentage
       }
     }
     ```
   - Parse `All`, `Easy`, `Medium`, `Hard` counts and contest rating.
2. **`fetch_github_stats(username: str)`:**
   - GET `https://api.github.com/users/{username}` and `https://api.github.com/users/{username}/repos?per_page=100&sort=updated`.
   - Compute `publicRepos`, `followers`, `totalStars` (sum of `stargazers_count`), and `topLanguages` (top 5 distinct `language` values).
   - Also return a map of repo names to `{ description, html_url, homepage, stargazers_count }` to auto-enrich matching projects!
3. **`fetch_codeforces_stats(username: str)`:**
   - GET `https://codeforces.com/api/user.info?handles={username}`.
   - Extract `rating`, `maxRating`, and `rank`.
4. **`fetch_codechef_stats(username: str)`:**
   - GET `https://www.codechef.com/users/{username}` with browser User-Agent header.
   - Use regex / BeautifulSoup to extract `.rating-number` (int), `.rating-star` (count of stars or text like `3★`), and highest rating.
5. **`enrich_project_screenshots(projects: list)`:**
   - For each project:
     - If `project.imageUrl` is already a valid custom image, keep it.
     - Else if `project.liveUrl` is present, set:
       `imageUrl = f"https://api.microlink.io/?url={urllib.parse.quote(project.liveUrl, safe='')}&screenshot=true&meta=false&embed=screenshot.url"`
     - Else if `project.githubUrl` is present and matches `github.com/([^/]+)/([^/]+)`, set:
       `imageUrl = f"https://opengraph.githubassets.com/1/{owner}/{repo}"`

### 4.3 Resume PDF Parser + LLM Structured Generator (`backend/app/services/portfolio_parser.py`)
1. **PDF Text + Hyperlink Extractor:**
   - Use `fitz` (PyMuPDF) or `pypdf` to extract all text from each page AND iterate over page links/annotations (`/Annots` -> `/A` -> `/URI`) to collect a list of all embedded URLs (e.g., `github.com/...`, `leetcode.com/...`, `codechef.com/...`, `vercel.app`, `netlify.app`).
2. **LLM Structured Extraction:**
   - Use the project's configured LLM provider (Gemini / Claude / OpenAI / Groq in `.env`) to convert the extracted resume text + discovered URLs into the `PortfolioData` JSON format.
   - If no LLM API key is active or if an API call fails, implement a **Deterministic Smart Regex + Heuristic Resume Parser Fallback** that extracts Name, Email, Phone, GitHub/LinkedCode/CodeChef usernames, Skills, Education, Experience, and Projects directly from the resume text so PDF upload **always works 100% reliably** even offline or without API keys!
3. **Auto-Enrichment Chaining:**
   - Immediately pass extracted usernames (`github`, `leetcode`, `codechef`, `codeforces`) and `projects` through `portfolio_enrichment.py` before saving to the database.

### 4.4 FastAPI Endpoints (`backend/app/api/portfolio.py`)
Register these endpoints under `/api/portfolio`:
- `GET /api/portfolio/check-handle?handle={slug}` -> Checks format (`^[a-z0-9-]{3,30}$`), checks DB uniqueness, returns `{ available: bool, handle: str, message: str }`.
- `POST /api/portfolio/claim-handle` -> Claims handle for user (or updates existing handle) and initializes portfolio with `defaultPortfolioData` merged with any existing user info.
- `POST /api/portfolio/upload-resume` -> Accepts `UploadFile` PDF, runs `portfolio_parser` + `portfolio_enrichment`, updates user's `portfolio_data`, and returns the enriched `PortfolioData`.
- `POST /api/portfolio/sync-stats` -> Accepts `{ github, leetcode, codechef, codeforces }`, runs live scrapers, updates `codingStats` & project screenshots, saves, and returns updated `PortfolioData`.
- `GET /api/portfolio/me` -> Returns current user's `PortfolioData` (or creates/returns a default initialized portfolio if none exists yet).
- `PUT /api/portfolio/me` -> Updates full `PortfolioData` or `config` (`templateId`, `themeMode`, `mascotId`, `accentColor`, `basics`, `projects`, etc.).
- `GET /api/portfolio/public/{handle}` -> Public endpoint that looks up portfolio by `handle` (case-insensitive), increments `views_count`, and returns `PortfolioData` (with fallback to demo portfolio if `handle == "flyingmohit"` or `"demo"` so live preview always works out-of-the-box!).

---

## 5. THE 5 INTERACTIVE ANIMATED SVG MASCOTS (`MascotWidget.tsx`)

Create `frontend/src/components/portfolio/mascots/MascotWidget.tsx`.
This component renders a floating, draggable/dockable interactive companion with:
- Smooth Framer Motion physics, idle animations, and click reactions.
- Real-time **Mouse Cursor Tracking** (calculating `dx, dy` between mouse coordinates and mascot eye centers so pupils follow the visitor's cursor!).
- Interactive **Speech Bubble** that cycles witty, personalized tech lines about the portfolio owner (e.g., *"Mohit's CodeChef rating is 1623 (3★)! 🔥"*, *"Click any project to test the live deployment 🚀"*, *"Psst... toggle Light/Dark mode to see the theme engine!"*) and lets visitors click `"Ask me about {firstName}"` to cycle highlights.

Build all 5 distinct SVG characters inside `MascotWidget.tsx`:
1. **`cyber-alien` (Galactic 10x Engineer):**
   - Neon emerald/cyan alien inside a translucent glass UFO dome with bobbing antenna and glowing thruster rings underneath.
   - **Special Effect:** Dual large alien eyes with cursor-tracking glowing pupils; clicking triggers a tractor-beam abduction animation with floating binary `0101` particles.
2. **`voxel-bot` (3D Studio Isometric Mecha-Dev):**
   - Inspired by the 3D Studio voxel character—blocky isometric robot wearing oversized studio headphones and a hoodie, with an LED matrix face screen showing animated expressions (`{ ^ _ ^ }`, `{ > _ < }`, `{ 10x }`, `{ ♥ }`).
   - **Special Effect:** Bobs in 3D space; clicking triggers a jetpack boost and pixel confetti burst.
3. **`coder-cat` (Workshop Line-Art Hoodie Cat):**
   - Inspired by the Workshop template—hand-drawn style cute cat peeking over a MacBook with a glowing logo, a steaming coffee mug, and a hanging filament lightbulb overhead.
   - **Special Effect:** Paws animate rapidly typing whenever the user scrolls or moves the mouse; clicking switches the overhead lightbulb between warm glow and neon party mode!
4. **`ai-orb` (Sentient Neural Core):**
   - Multi-ring rotating holographic gyroscope with a pulsing plasma core and orbiting data nodes.
   - **Special Effect:** Expands on hover into a mini holographic HUD showing quick telemetry (`DSA Solved`, `Top Stack`, `Status: Ready to Hire`).
5. **`terminal-dino` (Retro Compiler T-Rex):**
   - Crisp pixel-art T-Rex wearing Matrix deal-with-it sunglasses.
   - **Special Effect:** Clicking triggers a mini jump animation over a scrolling `"404 BUG"` cactus with a live jump score counter badge!

---

## 6. THE 5 SIGNATURE TECH TEMPLATES (DEEP VISUAL & INTERACTIVE SPECS)

Create each template in `frontend/src/components/portfolio/templates/`:
- Every template MUST accept `{ data: PortfolioData; isPreview?: boolean; onUpdateConfig?: (partial: Partial<PortfolioConfig>) => void }`.
- Every template MUST support **both `dark` and `light` themes** dynamically (using local state initialized from `data.config.themeMode` + a sleek floating/header Light/Dark toggle button so visitors or recruiters can test both themes live!).
- Every template MUST render **100% of the user's resume sections**:
  1. Hero Section (Avatar, Name, Headline, Availability Badge, Bio, Social Links, Resume Download CTA)
  2. Live Coding Profiles & Competitive Programming Telemetry (LeetCode, CodeChef, Codeforces, GitHub stats with direct profile links)
  3. Featured & All Projects Showcase (with Project Screenshot image, fallback stylized tech banner if image fails to load, Tech Stack badges, Key Metrics badge, GitHub Repo button, and Live Demo link)
  4. Work Experience Timeline
  5. Categorized Technical Skills Matrix (`Languages`, `Frameworks`, `Databases & Cloud`, `AI & ML`, `Core CS & Tools`)
  6. Education & Academic Highlights
  7. Achievements & Awards
  8. Interactive Contact Footer + `<MascotWidget />`

---

### TEMPLATE 1: `BlueprintTemplate.tsx` — *"Blueprint (Engineering CAD Schematic & CP Grid)"*
- **Design Language:** Inspired by `itsfolio` Blueprint—precision architectural drafting table meets competitive programming telemetry dashboard.
- **Dual Theme Palette:**
  - **Light Mode:** Drafting Paper White (`#F8FAFC`) with crisp CAD blueprint grid lines (`background-size: 32px 32px`, `rgba(29, 78, 216, 0.08)`), technical dimension borders (`#BFDBFE`), Royal Blueprint Blue (`#1D4ED8`) accents, and red/amber/emerald metric bars.
  - **Dark Mode:** Deep Naval CAD Slate (`#060B16`) with cyan/blue glowing grid lines (`rgba(56, 189, 248, 0.09)`), technical corner crosshairs (`+`), monospace dimension callouts (`SEC-01 // REV-2026`), and neon cyan (`#38BDF8`) highlights.
- **Signature Layout & Effects:**
  - **Top Engineering Header Bar:** Displays `CAD-SPEC // {handle.toUpperCase()}`, live coordinates that update with mouse movement (`X: 0412 Y: 0891`), Light/Dark blueprint switch, and `"EXPORT RESUME.PDF"` button.
  - **Hero + Live Coding Telemetry Matrix (Split 12-Column CAD Grid):**
    - Left 5 cols: Identity Blueprint with technical callout lines, status indicator (`● SYSTEM ONLINE — OPEN TO ROLES`), bio, and social schematic ports.
    - Right 7 cols: **Verified Coding Profile Cards** (just like the reference screenshot!):
      - Giant monospace numbers (`1623` CodeChef 3★, `460+` LeetCode Solved, `1380` Codeforces Specialist, `28` GitHub Repos) with multi-color horizontal breakdown bars (Easy in Green, Medium in Amber, Hard in Red) and clickable external verification links.
  - **Schematic Project Blueprints:**
    - 2-column grid where each card has a top technical title block (`FIG 01 // PROJECT ARCHITECTURE`), live browser screenshot with blueprint overlay grid on hover, performance metric stamp, tech stack pills, and `[ SOURCE CODE ↗ ]` / `[ LIVE DEPLOYMENT ↗ ]` buttons.
  - **Experience, Skills & Education Blocks:** Laid out in interlocking bordered cells with `01 // EXPERIENCE`, `02 // TECH MATRIX`, `03 // EDUCATION`, and `04 // HONORS` vertical rotated section labels.

---

### TEMPLATE 2: `DevOSTemplate.tsx` — *"DevOS (Interactive macOS Sequoia + VS Code IDE)"*
- **Design Language:** Inspired by `itsfolio` macOS Sequoia + developer IDE workspace.
- **Dual Theme Palette:**
  - **Light Mode:** Cupertino Daylight Frosted Glass (`bg-white/80 backdrop-blur-2xl border-slate-200/80`) over a soft pastel macOS Sequoia mesh wallpaper with crisp shadows.
  - **Dark Mode:** macOS Sequoia Midnight + Tokyo Night IDE (`bg-[#0D1117]/90 backdrop-blur-2xl border-white/10`) over a deep aurora wallpaper with syntax-highlighted neon accents.
- **Signature Layout & Effects:**
  - **Top macOS Menu Bar:** Apple/Terminal icon, bold User Name, `File Edit View Window Help`, View Mode switcher (`IDE Window View` vs `Full Page Scroll`), live clock, Wi-Fi/Battery icons, and Light/Dark toggle.
  - **Main Interactive IDE + OS Window:**
    - Window chrome with Traffic Light buttons (Red/Yellow/Green), file tab bar (`overview.tsx`, `projects.json`, `coding_profiles.py`, `experience.md`, `terminal.sh`), and breadcrumb bar (`src > portfolio > {handle}`).
    - **Dual Navigation Mode:** Visitors can EITHER click tabs/sidebar files in the IDE to jump between sections OR simply scroll down where all OS windows (`Projects Finder Window`, `Coding Stats Monitor`, `Experience Log`, `Education & Skills Inspector`) are laid out cleanly so nothing is hidden!
  - **Built-in Interactive Terminal Widget:**
    - Allows clicking command chips (`./show-projects.sh`, `cat skills.json`, `fetch --coding-stats`, `whoami`, `contact --email`) or typing custom commands (`help`, `clear`, `hire`) with instant animated output!
  - **Floating macOS Dock at Bottom:**
    - Glassmorphic dock with smooth hover icon magnification for `Home`, `Projects`, `Coding Stats`, `Experience`, `Terminal`, `GitHub`, `LinkedIn`, `Resume`, and `Theme Toggle`.

---

### TEMPLATE 3: `NeuralBentoTemplate.tsx` — *"Neural Bento (Vercel / Linear / Raycast AI-Tech Grid)"*
- **Design Language:** Ultra-sleek Silicon Valley SaaS Bento Box architecture with spotlight hover borders and fluid micro-interactions.
- **Dual Theme Palette:**
  - **Light Mode:** Pure Alabaster (`#F4F4F5`) background with crisp `#FFFFFF` bento cards, `1px solid #E4E4E7` borders, subtle ambient shadows, and Emerald/Violet accents.
  - **Dark Mode:** Obsidian Void (`#050508`) background with `#0C0D12` bento cards, radial mouse-following border glow, subtle dot matrix background, and glowing Emerald/Pista (`#10B981`) or Cyan (`#06B6D4`) aura gradients.
- **Signature Layout & Effects:**
  - **Bento Grid Master Layout (12-Column Responsive Bento):**
    - **Cell 1 (Span 8):** Hero Identity Card with glowing availability pill, gradient display typography, bio, one-click `"Copy Email"` button (with `"Copied!"` checkmark toast), and `"Download Resume"`.
    - **Cell 2 (Span 4):** Live Competitive Programming Radar Card with radial SVG progress ring for LeetCode problems solved + CodeChef Star badge + Codeforces rank pill.
    - **Cell 3 (Span 4):** GitHub Pulse Card showing public repos, stars, followers, and top language distribution bar.
    - **Cell 4 (Span 8):** Interactive Tech Stack Marquee & Filter—clicking any skill pill highlights matching projects below!
  - **Editorial Bento Project Showcase:**
    - Featured projects span 6 or 12 columns with high-resolution browser-framed screenshots (like the `CodeForge AI` reference card!), smooth hover image zoom, metric badge pill, tech stack tags, and magnetic action buttons.
  - **Experience & Education Bento Timeline:** Clean side-by-side timeline cards with company badges, bullet highlights, and achievement trophies.

---

### TEMPLATE 4: `DevSearchTemplate.tsx` — *"DevSearch (Google Search Engine + Knowledge Graph UI)"*
- **Design Language:** Inspired by `itsfolio` Google Search template—turns the developer's entire career into an interactive search engine results page (SERP).
- **Dual Theme Palette:**
  - **Light Mode:** Classic Google Clean White (`#FFFFFF`) with `#F8F9FA` header bar, `#1A0DAB` clickable result titles, `#006621` / `#188038` URL breadcrumbs, and `#DADCE0` Knowledge Graph border.
  - **Dark Mode:** Authentic Google Dark (`#202124`) with `#303134` search bar & cards, `#8AB4F8` result titles, `#81C995` breadcrumbs, and `#3C4043` borders.
- **Signature Layout & Effects:**
  - **Sticky Search Engine Header:**
    - Brand logo (`DevSearch` in tech-accent colors) + rounded Search Input pre-filled with `"{fullName} — {headline}"`.
    - **Real Live Search:** Typing any keyword in the search bar (e.g., `"React"`, `"FastAPI"`, `"AI"`, `"CodeChef"`) dynamically filters or highlights matching projects, skills, and experience!
    - **Search Category Tabs:** `All`, `Projects ({count})`, `Coding Profiles`, `Experience`, `Skills`, `Education & Honors` + Light/Dark theme toggle button on the right.
  - **Two-Column SERP Layout:**
    - **Left Main Column (Search Results):**
      - Result stats line: `"About 1,040,000 results (0.03 seconds) — Showing verified portfolio data for {fullName}"`.
      - **Featured Snippet Box:** Highlights bio, top achievements, and core tech stack in a bordered callout box.
      - **"People Also Ask" Interactive Accordions:** 4 expandable questions (*"What are {firstName}'s top full-stack & AI projects?"*, *"What are {firstName}'s LeetCode and CodeChef ratings?"*, *"What is {firstName}'s work experience?"*, *"How can I hire or contact {firstName}?"*).
      - **Project Rich Search Results:** Each project renders as a Google Rich Result with favicon, breadcrumb (`https://{handle}.onestop.tech › projects › {slug}`), blue/sky-blue headline link, description, tech-stack sub-links, and a right-aligned project screenshot thumbnail!
      - **Experience & Education Search Results:** Structured SERP cards with dates, role titles, and bullet snippets.
    - **Right Sidebar ("Knowledge Graph" Identity Panel):**
      - Bordered card pinned on desktop showing Avatar/Photo, Full Name, Headline, `"Download Resume"` CTA, Quick Facts table (`Location`, `Education`, `LeetCode`, `CodeChef`, `Codeforces`, `GitHub`), and Social Profile icon links.

---

### TEMPLATE 5: `ShipLogBrutalistTemplate.tsx` — *"ShipLog Brutalist (Neo-Brutalist Startup & Indie Builder)"*
- **Design Language:** Inspired by `itsfolio` Brutalism & Mainframe (*"Builds fast, ships often"*, shipping-manifest portfolio with access pass, project crates, and raw typography).
- **Dual Theme Palette:**
  - **Light Mode:** Editorial Off-White / Warm Newsprint (`#F4F0EA`) with bold `2px solid #000000` borders, hard neo-brutalist offset shadows (`shadow-[5px_5px_0px_0px_#000000]`), Acid Yellow (`#FDE047`), Mint Green (`#6EE7B7`), and International Orange (`#FF5722`) sticker accents.
  - **Dark Mode:** Industrial Carbon (`#0A0A0A`) with `2px solid #F4F0EA` borders, neon emerald/lime hard offset shadows (`shadow-[5px_5px_0px_0px_#10B981]`), and high-contrast monospace/display typography.
- **Signature Layout & Effects:**
  - **Top Scrolling Marquee Ticker:** Infinite scrolling brutalist banner: `★ AVAILABLE FOR HIRE // BUILDS FAST, SHIPS OFTEN // LEETCODE {totalSolved}+ // CODECHEF {rating} ({stars}) // FULL-STACK & AI ENGINEER ★`.
  - **Hero with Interactive VIP Developer Access Pass / Lanyard Card:**
    - Left side: Giant bold display typography (`{fullName.toUpperCase()}`), shipping manifesto bio, and mechanical press CTA buttons (`translate-x-[3px] translate-y-[3px] shadow-none` on hover/click).
    - Right side: **Access Pass ID Card** (inspired by the Alex Rivera Brutalism reference screenshot!) with photo/avatar, lanyard slot graphic, `CLEARANCE: LEVEL-5 SDE`, live barcode SVG, verified coding ratings stamp, and QR/handle tag.
  - **Project Shipping Crates (`SHIPMENT_LOG // PROOF OF WORK`):**
    - Projects styled as numbered industrial shipping manifests (`CRATE #01`, `STATUS: DEPLOYED`) with thick framed screenshots, bold tech sticker tags, impact metrics, and hard-shadow action buttons.
  - **Git Commit Graph Experience & Skills Table:**
    - Experience rendered as a high-contrast `git log` commit timeline (`commit 8f92a1 //HEAD -> main`), and skills organized in a brutalist specification table.

---

## 7. PORTFOLIO STUDIO UI & ROUTING (`frontend/`)

### 7.1 Frontend Routes & Navigation Integration
Inspect `frontend/` to see how sidebar/navbar links to the Portfolio/Profile Builder module (e.g., `/portfolio` or `/profile-builder` or `/dashboard/portfolio`). Make sure BOTH the existing sidebar route AND `/portfolio` render our new **Portfolio Studio** seamlessly, and add the public live route `/p/[handle]`.

### 7.2 Views Inside Portfolio Studio:
1. **`ClaimHandleModalOrView`:**
   - Matches the reference screenshots (`Claim your handle. This will be your unique portfolio link.`):
   - Input box with bold `{input}` and muted `.onestop.tech` suffix.
   - Real-time validation badge (`✓ Looks good!` in emerald OR `This username is already taken.` in red).
   - Checkbox: `"I agree to the Terms and Conditions and Privacy Policy."`
   - Full-width rounded pill button: `"Claim Handle"`.
2. **`TopStudioNavbar`:**
   - Left: Brand logo + `OneStop Portfolio` title + active handle badge (`{handle}.onestop.tech`).
   - Center/Right Navigation Tabs (matching reference screenshot!):
     - **`Dashboard`** (Icon + Label)
     - **`Edit Data`** (Icon + Label)
     - **`Customize`** (Icon + Label)
     - **`Templates`** (Icon + Label)
   - Quick `"Upload Resume PDF"` button in header for instant AI re-parsing.
3. **`DashboardTab` (Live Interactive Preview + Floating Bar):**
   - Renders the active template (`Blueprint`, `DevOS`, `NeuralBento`, `DevSearch`, or `ShipLog`) at full width inside a responsive preview container with a device switcher (`Desktop` / `Mobile` view) and quick Theme toggle (`Light` / `Dark`).
   - **Floating Bottom Action Pill (Exact match to reference screenshot 10!):**
     - Left button: **`Share`** (copies live URL `/p/{handle}` to clipboard + opens a Share Modal with QR Code, one-click Copy Link, LinkedIn share, Twitter/X share, and WhatsApp share).
     - Right primary dark pill button: **`View Live ↗`** (opens `/p/{handle}` in a new tab).
4. **`TemplatesTab` (`Explore Templates.` / `Choose your template.`):**
   - Matches reference screenshots 1–6 & 9:
   - Header: **`Explore Templates.`** (*"Find the perfect design for your portfolio. Preview themes and apply them instantly."*)
   - 2-column visual showcase grid of all 5 templates:
     - Each card displays a custom-built visual miniature preview of that exact template's aesthetic, the Template Name (`Blueprint`, `DevOS`, `Neural Bento`, `DevSearch`, `ShipLog Brutalist`), target role badges (`Software Engineers`, `Competitive Programmers`, `AI Builders`, etc.), popularity pill (`🔥 Trending`, `★ Recommended`, `742 devs using this`), a `"Preview"` button, and an `"Apply Template"` button.
5. **`EditDataTab` (Full Visual Editor + AI Resume Sync):**
   - **AI Resume Dropzone Card:** Upload any `.pdf` resume -> calls `POST /api/portfolio/upload-resume` -> auto-fills all sections and fetches live coding stats & project screenshots!
   - **Live Coding Profile Sync Card:** Input fields for `GitHub Username`, `LeetCode Username`, `CodeChef Username`, `Codeforces Username` + a **`"Sync Live Stats Now"`** button that calls `POST /api/portfolio/sync-stats` and updates ratings/solved counts live on screen.
   - **Structured Sub-Tabs for Manual Editing:**
     - `Basics & Socials` (Name, Headline, Short Bio, Long Bio, Availability, Email, Location, Resume URL, Avatar URL)
     - `Projects` (Add/Edit/Delete project, Title, Tagline, Description, Tech Stack comma-separated/tags, GitHub URL, Live URL, Metrics, and `"Auto-Generate Screenshot from URL"` button)
     - `Experience` (Add/Edit/Delete role, Company, Dates, Location, Bullet points, Tech used)
     - `Skills` (Edit `Languages`, `Frameworks`, `Databases & Cloud`, `AI & ML`, `Core CS & Tools`)
     - `Education & Achievements`
   - Floating `"Save Changes"` bar with instant persistence to `PUT /api/portfolio/me`.
6. **`CustomizeTab` (Theme, Mascots & Accents):**
   - **Default Theme Mode Selector:** Visual toggle cards for `Dark Mode` and `Light Mode`.
   - **Interactive Mascot Selector:** Visual preview cards for all 5 Mascots (`Cyber-Alien`, `Voxel-Bot`, `Coder-Cat`, `AI-Orb`, `Terminal-Dino`, and `No Mascot`) where clicking any mascot immediately updates the live portfolio!
   - **Accent Color Picker:** Swatches for `Emerald (Pista Green)`, `Cyan (Blueprint)`, `Violet (Neural)`, `Amber (Solar)`, and `Rose (Crimson)`.
7. **Public Live Route (`frontend/src/app/p/[handle]/page.tsx`):**
   - Fetches portfolio data from `GET /api/portfolio/public/{handle}` (with client/server fallback to `defaultPortfolioData` if backend is offline or demo handle is visited).
   - Renders the full-screen chosen template with zero dashboard chrome, a sleek floating corner pill for visitors to toggle `Light / Dark Mode`, interact with the chosen `MascotWidget`, or `Download Resume`, plus a subtle footer attribution `"Powered by ONEstopPlacement AI"`.
   - Update or create Next.js `middleware.ts` so subdomain requests like `{handle}.localhost:3000` automatically rewrite to `/p/{handle}`.

---

## 8. STEP-BY-STEP EXECUTION PLAN FOR CLAUDE CLI

Execute these steps sequentially without stopping for confirmation:
1. **Step 1:** Inspect the workspace structure (`backend/` and `frontend/`), check existing database configuration, and fix any DB connection issues if present.
2. **Step 2:** Create Backend SQLAlchemy model (`models/portfolio.py`), Pydantic schemas (`schemas/portfolio.py`), Live Profile & Screenshot Enrichment service (`services/portfolio_enrichment.py`), Resume PDF + Hyperlink Parser (`services/portfolio_parser.py`), and FastAPI router (`api/portfolio.py`). Register the router in `backend/app/main.py` and verify backend imports cleanly.
3. **Step 3:** Create Frontend TypeScript types (`types/portfolio.ts`) and rich Default Data (`lib/defaultPortfolioData.ts`).
4. **Step 4:** Build `MascotWidget.tsx` with all **5 Interactive Animated SVG Mascots** and mouse-tracking eyes/speech bubbles.
5. **Step 5:** Build all **5 Complete Portfolio Templates** (`BlueprintTemplate.tsx`, `DevOSTemplate.tsx`, `NeuralBentoTemplate.tsx`, `DevSearchTemplate.tsx`, `ShipLogBrutalistTemplate.tsx`) with full Light/Dark theme support and 100% data coverage.
6. **Step 6:** Build the **Portfolio Studio Dashboard** (`ClaimHandle`, `Dashboard` preview with `Share` + `View Live` bar, `Edit Data` with PDF upload & live coding sync, `Customize` with Mascot/Theme pickers, and `Templates` explorer) and wire it into the app's routing + `/p/[handle]` live route.
7. **Step 7:** Run TypeScript typechecking (`npx tsc --noEmit`) and backend verification, fixing any lint/type/import errors until 100% clean.