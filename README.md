<div align="center">

# 🎯 ONEstopPlacement

### Your AI-powered placement operating system

**One workspace for a student's whole placement journey: a live portfolio website, a resume tailored to the job description, a company-specific interview plan and every coding profile in one place.**

<br/>

[![CI](https://github.com/mohityadav24952-ai/ONEstopPlacement/actions/workflows/ci.yml/badge.svg)](https://github.com/mohityadav24952-ai/ONEstopPlacement/actions/workflows/ci.yml)

![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-149ECA?style=for-the-badge&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)

![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Auth_·_DB_·_Storage-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)

![Gemini](https://img.shields.io/badge/Google_Gemini-LLM-8E75B2?style=flat-square&logo=googlegemini&logoColor=white)
![Groq](https://img.shields.io/badge/Groq-fallback_LLM-F55036?style=flat-square)
![Tavily](https://img.shields.io/badge/Tavily-web_search-1E3A8A?style=flat-square)
![Vercel](https://img.shields.io/badge/Vercel-frontend_+_1--click_deploys-000000?style=flat-square&logo=vercel&logoColor=white)
![Render](https://img.shields.io/badge/Render-backend-46E3B7?style=flat-square&logo=render&logoColor=black)
![Playwright](https://img.shields.io/badge/Playwright-+_axe-2EAD33?style=flat-square&logo=playwright&logoColor=white)

<br/>

**Upload your resume → choose a design → generate your portfolio → publish it.**
**Paste a job description → get a grounded, tailored resume → download the PDF.**
**Name the company, the role and your days left → get a day-wise preparation plan.**

</div>

---

> [!NOTE]
> **Design principle: the AI is a helper, never the source of truth.** Anything a model writes is checked against what the student actually wrote (resume text, profile facts, job-description quotes). Nothing is published or added to the profile until the student approves it.

---

## 🧭 Table of Contents

- [🌟 Overview](#-overview)
- [📸 Application Screenshots & Preview](#-application-screenshots--preview)
- [🚀 Core Features](#-core-features)
  - [01 · 🌐 AI Portfolio Generator](#01---turn-your-resume-into-a-live-portfolio-website)
  - [02 · 🎯 JD-Tailored Resume Builder](#02---build-a-job-description-tailored-resume-not-just-another-resume)
  - [03 · 🧠 Interview Preparation](#03---your-complete-company-specific-interview-preparation-command-center)
  - [04 · 💻 Coding Profile & GitHub Dashboard](#04---your-entire-coding-journey-one-unified-dashboard)
  - [05 · ✨ Meet Placey](#05---meet-placey--your-little-ai-companion-on-the-placement-journey)
  - [06 · 🎨 Themes, Effects & Personalization](#06---premium-uiux-themes--personalization)
  - [07 · 💬 Feedback & Creator Information](#07---feedback--creator-information)
- [🗺️ How It Works: A Student's Journey](#-how-it-works-a-students-journey)
- [🏗️ System Architecture](#-system-architecture)
- [🧰 Technology Stack](#-technology-stack)
- [🤖 AI Engineering Stack](#-ai-engineering-stack)
- [🏁 Local Setup](#-local-setup)
- [🔐 Environment Variables](#-environment-variables)
- [☁️ Production Deployment](#-production-deployment)
- [🗂️ Project Structure](#-project-structure)
- [🛡️ Security & Configuration Notes](#-security--configuration-notes)
- [🏆 Project Highlights](#-project-highlights)
- [🔭 Current Scope & Future Work](#-current-scope--future-work)
- [🙏 Acknowledgements](#-acknowledgements)
- [👨‍💻 About the Creator](#-about-the-creator)

---

## 🌟 Overview

Placement preparation is usually scattered across a dozen tabs: a resume editor, a portfolio builder, a DSA sheet, a notes doc for OS/DBMS/CN/OOP, five coding-profile pages and a pile of interview-experience links. **ONEstopPlacement puts that whole workflow in one signed-in workspace** and connects the pieces, so data entered once is reused everywhere.

| | Module | In one line |
|:-:|---|---|
| 🌐 | **Portfolio Website** | Turns a resume PDF into a hosted portfolio site with 6 templates, a QR share card, a ZIP export and one-click deployment to Vercel. |
| 🎯 | **Resume Studio** | Analyses a resume against a job description, recommends better-matching GitHub projects and exports an ATS-friendly PDF that contains only lines you approved. |
| 🧠 | **Interview Prep** | Builds a day-wise plan for a company, a role and a deadline, covering DSA, OOP, DBMS, OS, CN, your own projects and HR. |
| 💻 | **Coding Dashboard** | Shows GitHub, LeetCode, CodeChef, Codeforces and HackerRank side by side, with freshness labels and manual fallbacks. |
| ✨ | **Placey** | A scripted mascot companion with 7 modes and 3 colours, plus **Ask Placey**, web-grounded answers on demand. |
| 🎨 | **Experience** | 4 themes, 8 individually switchable visual effects, a command palette and a mobile layout. |

---

## 📸 Application Screenshots & Preview

> [!TIP]
> Screenshots are coming soon. Each slot below has a reserved path in [`docs/screenshots/`](docs/). To add one, save the image at that path and remove the `<!--` and `-->` around its `<img>` tag. The README needs no other changes.

<table>
<tr>
<td width="50%" valign="top">

**🏠 Main Dashboard & Overview**<br/>
<sub>Home: the five-stage journey, next-best actions, module summaries and recent activity.</sub>

<!-- <img src="docs/screenshots/dashboard.png" alt="Main dashboard" width="100%"/> -->
`docs/screenshots/dashboard.png`

</td>
<td width="50%" valign="top">

**🌐 AI Portfolio Generator**<br/>
<sub>Site studio: resume upload, template gallery, Customize tab and the Vercel deploy card.</sub>

<!-- <img src="docs/screenshots/portfolio-generator.png" alt="Portfolio generator" width="100%"/> -->
`docs/screenshots/portfolio-generator.png`

</td>
</tr>
<tr>
<td width="50%" valign="top">

**🎯 JD-Based AI Resume Builder**<br/>
<sub>Requirement matching, GitHub project swap suggestions, the review checklist and the PDF preview.</sub>

<!-- <img src="docs/screenshots/resume-builder.png" alt="Resume builder" width="100%"/> -->
`docs/screenshots/resume-builder.png`

</td>
<td width="50%" valign="top">

**🧠 Company-Specific Interview Preparation**<br/>
<sub>A day-wise plan with DSA link cards, core-subject questions, Ask Placey and progress rings.</sub>

<!-- <img src="docs/screenshots/interview-preparation.png" alt="Interview preparation" width="100%"/> -->
`docs/screenshots/interview-preparation.png`

</td>
</tr>
<tr>
<td width="50%" valign="top">

**💻 Coding Profiles & GitHub Dashboard**<br/>
<sub>Platform cards, language share, push activity and repositories with README summaries.</sub>

<!-- <img src="docs/screenshots/coding-dashboard.png" alt="Coding dashboard" width="100%"/> -->
`docs/screenshots/coding-dashboard.png`

</td>
<td width="50%" valign="top">

**✨ Placey AI Companion**<br/>
<sub>Placey's outfits, colour tints, speech bubbles and settings panel.</sub>

<!-- <img src="docs/screenshots/placey.png" alt="Placey companion" width="100%"/> -->
`docs/screenshots/placey.png`

</td>
</tr>
<tr>
<td width="50%" valign="top">

**🎨 Four Themes & Premium UI Effects**<br/>
<sub>Classic Light, Emerald Forest, Golden Horizon and Neon Eclipse, with the effects layer.</sub>

<!-- <img src="docs/screenshots/themes-effects.png" alt="Themes and effects" width="100%"/> -->
`docs/screenshots/themes-effects.png`

</td>
<td width="50%" valign="top">

**⚙️ Settings & Personalization**<br/>
<sub>Effect switches, data export, feedback form and the About the Creator card.</sub>

<!-- <img src="docs/screenshots/settings.png" alt="Settings" width="100%"/> -->
`docs/screenshots/settings.png`

</td>
</tr>
</table>

<!-- Optional walkthrough GIF: save it as docs/screenshots/walkthrough.gif, then uncomment.
<p align="center"><img src="docs/screenshots/walkthrough.gif" alt="Product walkthrough" width="90%"/></p>
-->

---

## 🚀 Core Features

### 01 · 🌐 Turn Your Resume Into a Live Portfolio Website

Most students know they *should* have a portfolio site. Few have the time to design, build and host one. ONEstopPlacement reduces the job to **upload, choose, publish**.

```text
Claim a handle ──► Upload resume PDF ──► Review the extracted data ──► Pick a template & customise
      ──► Publish at /p/{handle} ──► Share link / QR ──► Export ZIP  or  🚀 Deploy to Vercel in one click
```

<details open>
<summary><b>How the workflow works, step by step</b></summary>

| Step | What happens |
|---|---|
| **1. Claim a handle** | Pick a URL handle (3–30 characters, `a–z 0–9 -`, reserved words blocked) and accept the terms. The site starts from your profile: name, headline, summary, email and location. |
| **2. Upload your resume** | Upload a PDF (up to 5 MB). The text is extracted with `pypdf`, with word spacing repaired from the layout extraction, and every hyperlink is collected, including links hidden behind text such as "GitHub". |
| **3. Extraction** | A **rule-based parser always runs**. When AI keys are configured, an LLM parse runs as well, with a strict JSON schema, inside a time budget. Any section the model drops is filled from the rule-based result. Every string the model returns must appear in the PDF; reworded bullets are replaced by the original wording. While this runs, the UI shows stage messages ("Reading PDF text…", "Extracting skills & experience…", "Almost there, final touches…"). |
| **4. Live stats** | GitHub, LeetCode, CodeChef and Codeforces usernames found in the resume (or typed in) are used to fetch live stats. Usernames already connected in the Coding Dashboard are filled in automatically. |
| **5. Edit** | Edit the data in tabs: Basics & Socials, Projects, Experience, Skills, Education & Achievements. |
| **6. Choose a design** | Pick one of **6 templates** and one of 5 mascots (or none). |
| **7. Customise** | Default light or dark mode (visitors can switch), 5 accent colours (emerald, cyan, violet, amber, rose), and switches for coding stats and the mascot. |
| **8. Publish** | Publishing makes the site public at `/p/{handle}`. It is server-rendered with OpenGraph metadata, and the phone number is never shown publicly. Unpublishing takes it offline again. |
| **9. Share** | A share modal shows the link and a **QR code**. |
| **10. Take it anywhere** | Download a **static ZIP** (HTML and CSS with inlined fonts, scripts removed) to host anywhere, or press **Deploy** for a live `*.vercel.app` URL. |

</details>

**🎨 The template gallery**

| Template | Character |
|---|---|
| ⭐ **Neon 3D Dev** | Flagship design, marked *Recommended* |
| 📐 **Blueprint** | Technical-drawing aesthetic |
| 🖥️ **DevOS** | Desktop-OS styled portfolio, marked *Popular pick* |
| 🧩 **Neural Bento** | Bento-grid layout |
| 🔎 **DevSearch** | Search-engine styled layout |
| 🧱 **ShipLog Brutalist** | Brutalist changelog style |

**Mascots:** Cyber-Alien · Voxel-Bot · Coder-Cat · AI-Orb · Terminal-Dino (or none).

#### 🚀 One-click Vercel deployment

When the platform operator has configured a `VERCEL_TOKEN`, a published portfolio deploys with a single click:

```text
Next.js renders /p/{handle} ──► static snapshot (/api/site-export/{handle})
   ──► FastAPI validates the ZIP (paths, size, file count)
   ──► Vercel REST API: upload files by SHA-1 ──► create a production deployment
   ──► UI polls status every 2.5 s ──► resolves the production domain ──► 🎉 live link
```

> [!IMPORTANT]
> Deployments go into **the platform operator's Vercel account** (one project per handle, usually `osp-{handle}.vercel.app`). Students do not need a Vercel account, and cannot deploy to their own yet; see [Future Work](#-current-scope--future-work). The portfolio must be published first, deploys are limited to 5 per hour, and if no token is configured the API answers `VERCEL_NOT_CONFIGURED`.

<sub>A simpler, earlier portfolio module is still available at `/portfolio`. It builds a static site from your approved profile with an optional AI-drafted introduction, 3 themes × 4 accents, and offers it as a ZIP export only.</sub>

---

### 02 · 🎯 Build a Job Description-Tailored Resume, Not Just Another Resume

A generic resume tells a recruiter what you've done. A tailored resume shows why you fit *this* role. Resume Studio walks you through four steps, **Import → Target role → Drafts → Review & approve**, and only facts you can back up reach the final PDF.

<details open>
<summary><b>The full workflow</b></summary>

1. **📄 Import your resume:** upload a **PDF or DOCX** (validated by file signature, macro-enabled DOCX and encrypted PDFs rejected, duplicates detected by hash). Scanned image-only PDFs are not supported because there is no OCR.
2. **🧾 Grounded parsing:** an LLM extracts structured data. Every item must be traceable to a span of the resume text or it is dropped. A rule-based skill taxonomy adds skills the model missed. Parsed items become **proposals** that you approve before they enter your profile.
3. **🔗 Link discovery:** on the first parse, coding-profile links (GitHub, LeetCode, CodeChef, HackerRank) found in the document, including hidden hyperlinks, are queued for one-click approval. You can also upload your `.tex` source; its `\href` and `\url` links are extracted, never compiled, and each one is allowed or refused.
4. **🎯 Add the target job description:** paste the JD (50–15,000 characters) with optional company, role and level.
5. **🔍 Requirement extraction:** an LLM lists the JD's requirements (skill, tool, domain, soft skill, experience level; *must* or *nice to have*). A requirement is kept **only if its supporting quote appears word for word in the JD**.
6. **⚖️ Deterministic matching:** code marks each requirement **matched** (used in a bullet, or listed at intermediate/advanced level), **partial** (only listed) or **missing**, with links to the evidence. The UI shows "X of N requirements matched". There is deliberately no invented percentage score.
7. **🚩 Gaps become flags, not lies:** every missing *must-have* becomes a claim flag. You dismiss it, or add evidence to your profile and recheck. Missing skills are **never** written into the resume.
8. **✍️ AI-suggested rewording:** an LLM proposes stronger bullets. A **code validator** rejects any suggestion that adds numbers, skills or tools not in the cited facts, lacks evidence, exceeds 300 characters, opens weakly ("Responsible for…") or repeats keywords. You accept or reject each surviving suggestion.
9. **🧠 AI summary:** a 2–3 sentence summary, rejected if it introduces facts not in your profile, with a non-AI fallback. It can be regenerated.

</details>

#### 💡 The differentiator: GitHub project recommendations

A student may have 20 repositories but only two that suit a backend role. **Swap suggestions** find them:

- Each repository is read: description, topics, primary language and **README** (the 25 most recently pushed repos are fetched from GitHub, capped at 6,000 characters each).
- A skill counts for a repo only if it appears **as a whole word** in that text, via the skill taxonomy and synonyms.
- For each candidate repo against each project already on the resume, the engine computes **JD skills gained − JD skills lost**, with must-haves weighted ×2.
- You get **up to 3 suggestions**, each showing what you gain (with a README evidence line) and what you lose. Nothing changes until you click **Apply**. The repo is then added to your profile as a verified project, and its bullets enter the review checklist as *pending*.

> The recommendation engine is **deterministic and explainable**: keyword and taxonomy matching over real repository content. It uses no LLM and no embeddings.

#### 🎛️ You stay in control

| You decide | How |
|---|---|
| **Every line** | A per-item review checklist covers the summary, education, each bullet, each skill, each achievement and each `.tex` link, with the states *pending*, *approved* or *rejected*. Items that match the JD are *locked in*: they can be reworded, but not removed. |
| **Wording** | Edit any bullet or the summary directly. An edit counts as approval. |
| **Skills** | Reorder or remove skills. New skills can't be added without evidence. |
| **Projects** | Accept or ignore GitHub swap suggestions. |
| **Header & contacts** | Edit them in the template editor. |
| **Final approval** | Blocked while any flag is unresolved or any item is pending. Approved versions are locked, and versions can be diffed. |

#### 🖨️ Templates & output

| Template | Notes |
|---|---|
| **Classic Software Engineer** | Default |
| **Tech Intern** | For internship applications |
| **Modern Developer** | Contemporary layout |
| **Matches your uploaded resume** | Approximates your original's fonts, header alignment and section order (not a pixel-perfect copy) |

The output is a **one-page PDF generated with ReportLab** in standard fonts, so the text stays selectable and ATS-readable. A fit report lists anything trimmed to fit the page. You can preview it live before approval and download `resume.pdf` after approval.

---

### 03 · 🧠 Your Complete Company-Specific Interview Preparation Command Center

Tell the app **the company, the role and how many days you have (1–60)**. Optionally add a level (Intern, Fresher, Junior or Mid-level) and a saved job description. You get a structured, day-by-day plan that covers far more than DSA.

```mermaid
flowchart LR
    A["Company + Role + Days<br/>(+ optional JD)"] --> P["Deterministic planner<br/>weighted day split"]
    P --> D["DSA days<br/>link cards + sheets"]
    P --> C["Core CS days<br/>OOP · DBMS · OS · CN"]
    P --> R["Project days<br/>questions from YOUR projects"]
    P --> H["HR day<br/>behavioural prep"]
    C --> AP["Ask Placey<br/>web-grounded answer"]
    H --> AP
```

#### A · 📅 A personalised day-wise plan
- Days are shared out by a **deterministic, rule-based planner** with topic weights (DSA 4 · OOP 2 · DBMS 2 · OS 1.5 · HR 1.5 · Projects 1.5 · CN 1). The plan is not generated by an LLM, so it is predictable and instant.
- If you attach a JD, skills in it raise the weight of the matching topics (e.g. SQL → DBMS, Java → OOP, Linux → OS), and **skill gaps** between the JD and your profile are listed.
- Each day focuses on one topic. Written topics get 2–5 questions per day, each project gets its own day (up to 3 projects), and each plan shuffles question order.

#### B · 🧮 DSA preparation
- **Every DSA day** sets a clear target: solve 3–5 problems, dry-run them and spot the pattern.
- **Company-specific link cards:** the LeetCode company page (for 16 mapped companies), the GeeksforGeeks company practice page, Naukri Code360 and targeted searches for *interview experience*, *online assessment*, *coding round* and *previous-year questions* on LeetCode Discuss and GfG.
- **Company-wise DSA sheets:** for **45 companies**, a direct link to that company's **Hynts** DSA sheet; for other companies, 5 problems per day from a curated pool of 100 problem links.
- **Topic-wise practice:** LeetCode tag pages (arrays, strings, hashing, DP, trees, graphs, binary search, linked lists and more) and GfG topic hubs.

> These links are **curated search and listing URLs** that open the latest posts on each platform. They are not dynamically scraped, and the app does not claim to know which problems a company asked.

#### C · 📚 Core computer science subjects
Preparation goes well beyond DSA. A curated bank of **109 questions** covers:

| Subject | Questions |
|---|:-:|
| 🧱 Object-Oriented Programming (OOP) | 25 |
| 🌐 Computer Networks (CN) | 25 |
| 🗃️ Database Management Systems (DBMS) | 31 |
| ⚙️ Operating Systems (OS) | 28 |

Difficulty is assigned by rules, and each plan rewords questions with rules (no AI), so two plans don't read the same.

#### D · 📝 Answers for every core-subject question
Every core-subject question has **"View Answer"**: a concise 3–6 line answer that loads instantly with no API call. These answers come from a **saved answer bank** in the repository (`core_answers.json`), written in advance with Claude. They are **not generated at runtime**, so they are consistent and free to serve.

#### E · ✨ Placey-powered answer assistance (Ask Placey)
Want more depth than the saved answer? Press **Ask Placey** on any OS, DBMS, CN, OOP or HR question. Unlike the saved answers, this is a **live, web-grounded answer**:
1. It checks a **shared answer cache**: an exact match, or a similar question by word-overlap (Jaccard) similarity. Cached answers appear instantly and are free.
2. On a miss, it runs **one Tavily web search** (up to 5 results).
3. It then makes **one Gemini call** (Pro model first, falling back to Flash models) that writes a short answer **citing those sources**, with a disclaimer and a "read more" link.

It is rate-limited (7 new questions per IP per day; cached answers don't count). When the AI quota is used up, it shows a friendly "Placey is resting" message instead of failing.

#### F · 🛠️ Project-based interview questions
Questions are generated from **your own profile projects** (title, description, tech stack) by one LLM call guided by 25 reference questions. Code filters out non-technical questions and fills any gap from templates. The questions are stored per project version, so the AI runs again only when a project changes. Need more? You can **generate extra AI practice questions** on demand (not for DSA), clearly labelled *AI-generated*.

#### G · 🤝 HR & behavioural preparation
Curated HR questions such as *"Tell me about yourself"* and *"Why this role?"*. Ask Placey gives **guidance, not a script**: hints, the company's stated values (when web sources describe them), framing tips and **STAR** prompts (Situation, Task, Action, Result). The answer itself stays yours, so it sounds like you.

#### H · 🔗 Interview preparation resources
- **Resources panel:** GfG topic hubs and LeetCode/GfG discussion searches for DSA, OOP, DBMS, OS, CN and HR, plus company links (GfG interview experiences, the GfG Company Interview Corner, LeetCode Discuss and the LeetCode company page).
- **Prep toolkit:** **Hynts Company-Wise DSA Sheet**, **Striver's A2Z DSA Sheet**, **NeetCode 150**, **InterviewBit** mock OA practice, **Excalidraw** for system design and **Levels.fyi** for salary research.
- **Interview experiences:** newest-first LeetCode Discuss and Code360 listings for your company and role.

#### I · 🌱 Motivation, progress & guidance
- Mark questions done, add notes, and track progress with a ring for the whole plan and a bar per day.
- Every question carries a provenance label: *Official source*, *Reported by candidates*, *Curated*, *AI-generated* or *Origin unknown*. Bad questions can be reported.
- A closing **"ALL THE BEST!"** card with rotating quotes from engineers such as Dijkstra, Torvalds, Kent Beck and Alan Kay, plus pro-tips (e.g. research the company's values).
- Placey switches to *Study Mode* on this page and celebrates when you finish a plan.

> **DSA + Core CS + your own projects + HR + resources + company targeting**, all in one plan.

---

### 04 · 💻 Your Entire Coding Journey, One Unified Dashboard

Connect your handles once and see them together, with honest labels about where each number came from and how fresh it is.

| Platform | How the data is fetched | What you see |
|---|---|---|
| <img src="https://cdn.simpleicons.org/github" width="14"/> **GitHub** | Official REST API, authenticated with a server token. Shared **1-hour cache**, with a stale copy served if GitHub rate-limits | Project repos (excluding forks, private repos and the profile repo), language share, push activity, repositories with **README summaries** |
| <img src="https://cdn.simpleicons.org/leetcode" width="14"/> **LeetCode** | Public GraphQL endpoint | Solved (easy/medium/hard), rating, peak, contests, streak, badge, top %, global rank |
| <img src="https://cdn.simpleicons.org/codechef" width="14"/> **CodeChef** | Public profile page (HTML parsing) | Rating, peak, stars, problems solved, contests, global and country rank |
| <img src="https://cdn.simpleicons.org/codeforces" width="14"/> **Codeforces** | Official public API | Rank, rating, max rating/rank, contests, unique problems solved |
| <img src="https://cdn.simpleicons.org/hackerrank" width="14"/> **HackerRank** | Public profile JSON endpoint | Star badges (Problem Solving, Java, C++, Python) |

- **Live data, honestly labelled:** every metric is fetched live, missing values are shown as *not available* (never as 0), and each card shows its source and freshness (*Fresh*, or *Stale* after 24 h).
- **Manual fallback:** if a live fetch fails, you can enter stats yourself. They are labelled *Entered by you* and flagged once they are 90 days old.
- **Refresh:** one refresh per account every 15 minutes; the last 5 snapshots are kept.
- **Charts** are built in-house with SVG and CSS: language share, pushes over the last 12 months, and LeetCode difficulty split.
- **Repository → profile:** "Propose project" turns a repo into a profile project proposal for you to approve.

> 🔗 **Connected to Resume Studio:** the repositories and READMEs synced here are what the [GitHub project recommendations](#-the-differentiator-github-project-recommendations) read when matching projects to a job description.

---

### 05 · ✨ Meet Placey — Your Little AI Companion on the Placement Journey

Placey is the platform's mascot: a small animated character that lives in the top bar, changes outfit with what you're doing and cheers you on. It is a **scripted companion, not a chatbot**, so it never interrupts while you type, goes quiet when the tab is hidden and never quotes your stats back at you. Its knowledgeable side is **Ask Placey**, the web-grounded answer feature in Interview Prep.

#### 👗 Seven modes

| Mode | When Placey switches to it |
|---|---|
| 🏆 **Victory Mode** | For 12 s after you complete a plan, approve a resume or approve a portfolio |
| 🔥 **Motivated Blob** | For 12 s after 5 questions are marked done within 10 minutes |
| 📖 **Study Mode** | On the Interview Prep page |
| 💻 **Hacker Spirit** | After 10+ minutes of active work on the Coding page |
| 🧭 **Tech Explorer** | On the Coding page |
| 😌 **Chill Mode** | After 60 minutes of active time (it also calms its own movement) |
| ☁️ **Classic Dreamy** | The default everywhere else |

<sub>Two page outfits based on Classic are also available: <b>Resume (focused)</b> and <b>Portfolio (creative)</b>. A mode you pick by hand always wins.</sub>

#### 🎨 Three colours

| Tint | Palette |
|---|---|
| 💜 **Lavender (classic)** | `#e9e6ff → #bcb8fb → #7f86ec` |
| 💛 **Sunny yellow** | `#fff8dc → #ffe28f → #f2b544` |
| 💗 **Bubblegum pink** | `#ffeaf4 → #ffb9da → #f079b4` |

#### 💬 Personality
- **140 mode-specific lines** (20 per mode) plus 12 situational lines (welcome back, first question, streaks, resume done, portfolio created and more), with no-repeat rules and cooldowns.
- Reacts to real events: questions done, plan complete, coding actions, resume approved, portfolio created, exported or approved.
- **Settings:** speech bubbles on/off, movement on/off, outfit (Automatic or any mode), colour, and hide. Saved in your browser.

---

### 06 · 🎨 Premium UI/UX, Themes & Personalization

#### 🌈 Four distinct themes
Switch themes from the top bar or the command palette (<kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>K</kbd>). Your choice is remembered, and it is applied before the first paint, so the page never flashes the wrong theme.

| Theme | Mode | Background | Primary |
|---|---|---|---|
| ☀️ **Classic Light** *(default)* | Light | `#f6f7f3` | `#1d7a59` |
| 🌲 **Emerald Forest** | Dark | `#071c18` | `#37c99a` |
| 🌅 **Golden Horizon** | Dark | `#19120d` | `#f4a62a` |
| 🌌 **Neon Eclipse** | Dark | `#05030f` | `#8b5cf6` |

Each module also has its own accent colour, so you always know where you are.

#### ✨ Eight switchable visual effects

| Effect | What it does |
|---|---|
| 🔦 **Cursor spotlight** | A soft light follows the pointer (disabled on touch devices) |
| 🪟 **Glass surfaces** | Frosted, blurred menus, dialogs and toasts, with a fallback for browsers without blur support |
| 🌫️ **Ambient background** | Two slowly drifting radial-gradient lights |
| 💡 **Accent glow** | Theme-aware glow on buttons, the active nav item and progress rings |
| 🖱️ **Hover effects** | Lift and motion on cards, buttons and nav icons |
| 🌈 **Gradient borders** | Animated gradient borders while hovered or focused |
| 🎬 **Entrance animations** | Staggered reveals, growing bars, drawn rings and count-up numbers |
| 🔀 **Page transitions** | Smooth fades between routes |

- **Effects controls:** **Settings → Appearance** has a master switch plus an individual switch for each effect. The choices are saved per browser and synced across open tabs.
- **Respectful by default:** `prefers-reduced-motion` is honoured, and on low-memory or low-core devices a lite mode removes the blur and the ambient animation automatically.
- **Responsive:** on phones and tablets a bottom navigation bar (with safe-area insets) replaces the sidebar. Playwright smoke tests render all six portfolio templates at phone width and fail on sideways scroll or axe accessibility violations.

#### ⚙️ Settings
**Account** (signed-in email) · **Appearance** (effect switches) · **Your data** (export everything as `my-data.json`) · **Privacy** · **Feedback & bugs** · **Delete account** (type `DELETE MY ACCOUNT` to confirm) · **About the Creator**.

---

### 07 · 💬 Feedback & Creator Information

- **Feedback & bug reports:** in **Settings**, choose *Feedback* or *Report a bug*, write at least 10 characters and send. The message is stored in the `feedbacks` table in PostgreSQL along with your account email and the page it was sent from, so the team can reply. It is included in your data export and deleted with your account. You can send up to 5 messages per hour.
- **About the Creator:** a card in Settings introduces the developer, with links to GitHub and LinkedIn ([see below](#-about-the-creator)).

---

## 🗺️ How It Works: A Student's Journey

Every step is optional and user-driven. The app suggests, and you decide.

1. **🔑 Sign in** with email and password, Google or GitHub (Supabase Auth).
2. **🏠 Explore Home:** see your five-stage journey (Profile → Coding → Resume → Prep → Portfolio), overall progress and up to four *next best actions*.
3. **💻 Connect coding profiles** on the Coding Dashboard, or approve the ones found in your uploaded resume.
4. **🌐 Generate your portfolio:** claim a handle, upload your resume, pick a template, publish, then share the link or deploy to Vercel.
5. **🎯 Target a job:** upload your resume to Resume Studio, paste the JD and review the requirement match.
6. **✍️ Tailor your resume:** apply project swaps, accept or reject AI rewording, resolve flags, approve, download the PDF.
7. **🧠 Prepare for the interview:** create a plan for the company, role and days left; work through DSA, core subjects, project and HR questions.
8. **📊 Review your coding profiles:** refresh platform stats before the interview and check which repositories best represent you.
9. **✨ Lean on Placey:** press **Ask Placey** for a web-grounded answer when a saved answer isn't enough, and pick Placey's outfit and colour in its settings.
10. **📈 Track progress** with plan progress rings, Home's journey tracker and Placey's celebrations.

---

## 🏗️ System Architecture

```mermaid
flowchart TB
    U(["👩‍🎓 Student's browser"])

    subgraph FE["Vercel · Next.js 16 frontend"]
        APP["App Router UI<br/>dashboard · studio · prep"]
        PUB["/p/{handle}<br/>server-rendered portfolios"]
        EXP["/api/site-export/{handle}<br/>static ZIP snapshot"]
    end

    subgraph BE["Render · FastAPI backend (Docker)"]
        API["REST API /api/v1<br/>JWT auth · rate limits"]
        AI["AI layer<br/>versioned prompts · validators · audit"]
        INT["Integrations<br/>GitHub · coding platforms · Vercel"]
    end

    subgraph SB["Supabase"]
        AUTH["Auth<br/>email · Google · GitHub"]
        DB[("PostgreSQL")]
        ST[("Private Storage<br/>resumes bucket")]
    end

    LLM["Gemini · Groq · OpenAI"]
    TAV["Tavily web search"]
    EXT["GitHub API · LeetCode · CodeChef<br/>Codeforces · HackerRank"]
    VC["Vercel API<br/>portfolio deployments"]

    U --> APP
    U --> PUB
    U <-->|sign-in| AUTH
    APP -->|Bearer JWT| API
    PUB --> API
    API -->|verify via JWKS| AUTH
    API --> DB
    API --> ST
    API --> AI
    AI --> LLM
    AI --> TAV
    API --> INT
    INT --> EXT
    INT --> VC
    VC -->|fetches snapshot| EXP
```

**How the pieces talk to each other**
- The browser signs in with **Supabase Auth** and sends the access token as `Authorization: Bearer …` to the FastAPI backend at `NEXT_PUBLIC_API_BASE_URL`.
- The backend **verifies every JWT** against Supabase's JWKS (RS256/ES256, issuer and audience checked) and filters every query by the signed-in user.
- **PostgreSQL** (Supabase) holds all application data through SQLAlchemy and Alembic. Uploaded files go to a **private Supabase Storage bucket**.
- All LLM, search and third-party calls are made **server-side**, so no AI key ever reaches the browser.
- For a Vercel deploy, the backend fetches the frontend's own static export of the portfolio and uploads it to Vercel.

---

## 🧰 Technology Stack

### 🖥️ Frontend

| Area | Technology |
|---|---|
| Framework | **Next.js 16** (App Router, Turbopack), **React 19** |
| Language | **TypeScript 5** |
| Styling | **Tailwind CSS 4** with CSS design tokens; 4 themes using `data-theme` |
| Auth client | `@supabase/supabase-js` (email/password, Google and GitHub OAuth with PKCE) |
| Icons | `lucide-react` (UI), `react-icons` including Simple Icons (brands and tech logos) |
| Charts & visuals | Custom SVG and CSS: progress rings, bars, language share (no chart library) |
| State | React Context (auth, Placey, toasts and dialogs) and `useSyncExternalStore` over localStorage (theme, effects) |
| Other | `qrcode` (portfolio share QR), `next/font` (Inter), host-based routing (`proxy.ts`) |
| Testing | Vitest (unit), Playwright + `@axe-core/playwright` (WCAG 2.1 A/AA smoke tests), ESLint |

### ⚙️ Backend

| Area | Technology |
|---|---|
| Framework | **FastAPI** on **Uvicorn**, Python **3.12** |
| Validation & config | **Pydantic v2**, `pydantic-settings` |
| Database access | **SQLAlchemy 2**, **Alembic** migrations, `psycopg` 3 |
| Auth | **PyJWT** with JWKS verification of Supabase tokens |
| HTTP client | **httpx** (LLM APIs, GitHub, coding platforms, Vercel, Supabase Storage) |
| Documents | **pypdf** (PDF text and links), **python-docx** (DOCX), **ReportLab** (resume PDF output), **Jinja2** (static portfolio export) |
| Uploads | `python-multipart`, with type checks by file signature and size limits |
| Testing | **pytest** with in-memory SQLite and `httpx.MockTransport`; runs fully offline |

### 🗄️ Database & storage

| Concern | Implementation |
|---|---|
| Database | **PostgreSQL on Supabase** (session pooler). Local dev bypass and tests use SQLite |
| Schema | Alembic migrations, run as a release step with `alembic upgrade head` |
| Files | **Private Supabase Storage bucket** (`resumes`) when `SUPABASE_SERVICE_ROLE_KEY` is set; local disk in development only |
| Auth | **Supabase Auth**; the backend checks tokens itself through JWKS |
| Vector storage | None; the app does not use embeddings |

### 🔌 External APIs & integrations

| Service | Role |
|---|---|
| **Google Gemini API** | Resume and JD parsing, rewording proposals, summaries, interview questions, Ask Placey |
| **Groq API** | Last-resort fallback for resume-to-portfolio parsing |
| **OpenAI API** | Optional general provider (`LLM_PROVIDER=openai`) |
| **Tavily** | Web search behind Ask Placey |
| **GitHub REST API** | Profile, repositories and READMEs (token-authenticated, cached) |
| **LeetCode** | Public GraphQL endpoint |
| **Codeforces** | Official public API |
| **CodeChef** | Public profile page parsing |
| **HackerRank** | Public profile JSON endpoint |
| **Vercel REST API** | One-click portfolio deployments |
| **microlink.io / GitHub OpenGraph** | Project preview images in portfolios |

---

## 🤖 AI Engineering Stack

> Accuracy note: everything below was checked against the code. Technologies that are **not** used are listed as not used.

### ✅ What is implemented

| Capability | How it works in ONEstopPlacement |
|---|---|
| **Provider-neutral LLM layer** | `backend/app/ai/llm.py` talks to the Gemini, Groq and OpenAI REST APIs directly over `httpx` (no vendor SDKs), behind one `LLMClient` interface, plus a **deterministic mock** so every AI feature works with no API keys. |
| **Key rotation & model fallback** | Resume-to-portfolio parsing tries Gemini key 1 (`gemini-3.5-flash`, then lighter Flash models), then key 2, then **Groq** (`openai/gpt-oss-120b`), then a **rule-based parser**. Ask Placey tries a Gemini Pro model first and then Flash models across the configured keys. An upload always produces a draft. |
| **Structured outputs** | Every workflow returns JSON validated by **Pydantic** models, with one retry when the output breaks the schema. Resume-to-portfolio parsing also sends a **strict JSON Schema to the provider** (Gemini `responseJsonSchema`, Groq/OpenAI strict `json_schema`), falling back to schema-less JSON if the provider rejects the schema. |
| **Prompt engineering** | 13 **versioned prompt files** (`backend/app/ai/prompts/*_vN.txt`). Untrusted input (resumes, JDs) is wrapped in an escaped `<data>` block so it is treated as data, not instructions. |
| **Grounding & verification** | Code, not the model, decides what is true: resume items must match source text, JD requirements need a word-for-word quote, rewording passes a claim validator (no new numbers, skills or tools), and summaries are rejected if they add facts. |
| **Search-then-summarise** | Ask Placey runs one Tavily search and passes the results to Gemini **as data**. Answers cite their sources. This is web-grounded generation, not vector RAG. |
| **Answer cache** | Ask Placey answers are cached in Postgres (`placey_cache`), and similar questions are matched by **Jaccard word-overlap**, so repeat questions cost nothing. |
| **AI audit trail** | The `ai_runs` table logs workflow, prompt version, provider, model, input hash, token counts, latency and status, but never prompt or output text. |
| **Document processing** | `pypdf` text and hyperlink extraction with kerning and spacing repair, DOCX parsing, and a rule-based resume parser as a safety net. |

**Where the LLM is used:** resume parsing · JD requirement extraction · resume bullet proposals · resume summary · portfolio introduction drafts (legacy module) · project-based interview questions · extra practice questions · Ask Placey answers and HR guidance · resume-to-portfolio parsing. Every call is triggered by a user action, never by a page load.

**What is deliberately rule-based:** the interview day planner, JD-to-profile matching, GitHub project recommendations, core-subject question wording, and the Placey companion.

### 🧾 How each piece is classified

| Category | Items |
|---|---|
| **Direct dependencies** (in `requirements.txt` / `package.json`) | `httpx` (all LLM and search calls), `pydantic` / `pydantic-settings` (output schemas), `pypdf`, `python-docx` (document processing). There are **no AI SDK packages**; providers are called over REST |
| **Indirect dependencies** | None that are AI-specific |
| **External AI services** | Google Gemini API · Groq API · OpenAI API (optional) · Tavily Search API |
| **Architectural concepts** (implemented in our own code) | Provider abstraction and fallback chains · versioned prompts · structured JSON outputs with validation and retry · grounding validators · search-then-summarise · response caching · AI audit logging · rule-based fallbacks |

### ⛔ Not used (so not claimed)

LangChain · LangGraph · LlamaIndex · embeddings · vector databases · vector RAG · MCP · tool/function calling · autonomous or multi-agent frameworks.

---

## 🏁 Local Setup

### Prerequisites

| Tool | Version |
|---|---|
| Python | **3.12** (as used by the Dockerfile and CI) |
| Node.js | **20+** (CI uses 22) |
| Supabase project | Free tier is enough (Postgres and Auth). Optional if you use the local dev bypass below |

### 1. Clone

```bash
git clone https://github.com/mohityadav24952-ai/ONEstopPlacement.git
cd ONEstopPlacement
```

### 2. Backend (terminal 1)

```bash
cd backend
python -m venv venv
venv\Scripts\activate                 # Windows  ·  macOS/Linux: source venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
copy .env.example .env                # macOS/Linux: cp .env.example .env
alembic upgrade head                  # creates the tables in DATABASE_URL
uvicorn app.main:app --reload         # → http://localhost:8000  (API docs at /docs)
```

### 3. Frontend (terminal 2)

```bash
cd frontend
npm install
copy .env.example .env.local          # macOS/Linux: cp .env.example .env.local
npm run dev                           # → http://localhost:3000
```

The frontend and backend are separate processes, so **run them in two terminals**.

<details>
<summary><b>🧪 Try it without Supabase or any API keys</b></summary>

For local development only:

- **backend `.env`:** `ENVIRONMENT=development`, `DEV_AUTH_BYPASS=true`, `LLM_PROVIDER=mock`
- **frontend `.env.local`:** `NEXT_PUBLIC_DEV_AUTH_BYPASS=true`

The backend then uses a local SQLite file (`dev.db`, created on startup) and accepts a fixed dev user, and every AI feature runs on a deterministic mock. The backend refuses to start with the bypass unless `ENVIRONMENT=development`, and production frontend builds ignore it.

</details>

### 4. Build, test & preview

```bash
# backend
cd backend
pytest -q                              # offline: in-memory SQLite, mocked AI and HTTP

# frontend
cd frontend
npx tsc --noEmit                       # type check
npm run lint
npm test                               # Vitest unit tests
npm run test:e2e                       # Playwright + axe (needs both dev servers)
npm run build && npm run start         # production build and local preview
```

CI (`.github/workflows/ci.yml`) runs the backend tests, `pip-audit`, migrations on a fresh database, the TypeScript check, lint, unit tests, `npm audit` and a production build on every push to `main`.

---

## 🔐 Environment Variables

> [!CAUTION]
> Never commit `.env` or `.env.local`. Only **public** values (the Supabase URL and anon key) may go to the frontend. Every other key is a server secret.

<details open>
<summary><b>Backend: <code>backend/.env</code></b> (full template in <a href="backend/.env.example"><code>backend/.env.example</code></a>)</summary>

| Variable | Required | Purpose |
|---|:-:|---|
| `ENVIRONMENT` | ✅ | `development` or `production` (production hides `/docs` and `/openapi.json`) |
| `LOG_LEVEL` | | `DEBUG` · `INFO` · `WARNING` · `ERROR` |
| `DATABASE_URL` | ✅ | Supabase **session pooler** connection string, e.g. `postgresql://postgres.YOUR_PROJECT_REF:YOUR_PASSWORD@YOUR_POOLER_HOST:5432/postgres` |
| `SUPABASE_URL` | ✅ | `https://YOUR_PROJECT_REF.supabase.co`, used for JWT issuer and JWKS checks |
| `SUPABASE_SERVICE_ROLE_KEY` | prod | Server-only key for the private Storage bucket (without it, files go to local disk in development only) |
| `SUPABASE_STORAGE_BUCKET` | | Bucket name (default `resumes`) |
| `CORS_ALLOWED_ORIGINS` | ✅ | Comma-separated frontend origins, no trailing slash |
| `CORS_ALLOWED_ORIGIN_REGEX` | | Extra allowed origins (default: this project's Vercel preview URLs; empty disables it) |
| `FRONTEND_ORIGIN` | ✅ | Public URL of the Next.js app (always allowed by CORS; used by Vercel deploys) |
| `LLM_PROVIDER` / `LLM_MODEL` | | `mock` (default) · `gemini` · `openai`, plus an optional model override |
| `GEMINI_API_KEY`, `GEMINI_API_KEY_1`, `GEMINI_API_KEY_2` | | Gemini keys, tried in rotation |
| `OPENAI_API_KEY` | | Needed when `LLM_PROVIDER=openai` |
| `GROQ_API_KEY` / `GROQ_MODEL` | | Fallback for resume-to-portfolio parsing |
| `RESUME_PARSE_MODEL`, `RESUME_PARSE_FALLBACK_MODELS` | | Gemini models for resume-to-portfolio parsing |
| `TAVILY_API_KEY` | | Web search for Ask Placey |
| `PLACEY_MODEL`, `PLACEY_FALLBACK_MODELS` | | Gemini models for Ask Placey |
| `PLACEY_IP_DAILY_LIMIT` | | New Ask Placey questions per IP per day (default 7) |
| `TRUST_FORWARDED_FOR` | | `true` only behind a proxy you control that sets `X-Forwarded-For` |
| `GITHUB_TOKEN` | | Fine-grained, public-read token: raises the GitHub limit from 60 to 5,000 requests per hour |
| `VERCEL_TOKEN`, `VERCEL_TEAM_ID`, `VERCEL_PROJECT_PREFIX` | | One-click portfolio deploys (the token is a full-access server secret) |
| `STORAGE_DIR`, `MAX_UPLOAD_MB`, `REFRESH_COOLDOWN_MINUTES`, `LLM_TIMEOUT_SECONDS` | | Local storage folder, upload limit (5 MB), refresh cooldown (15 min), AI timeout (60 s) |
| `DEV_AUTH_BYPASS` | | **Local development only**: SQLite plus a fixed dev user |

</details>

<details open>
<summary><b>Frontend: <code>frontend/.env.local</code></b> (template in <a href="frontend/.env.example"><code>frontend/.env.example</code></a>)</summary>

| Variable | Required | Purpose |
|---|:-:|---|
| `NEXT_PUBLIC_API_BASE_URL` | ✅ | FastAPI base URL, e.g. `http://localhost:8000` or `https://YOUR_BACKEND.onrender.com` |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | `https://YOUR_PROJECT_REF.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase **anon (public)** key, never the service-role key |
| `NEXT_PUBLIC_BASE_URL` | prod | Public URL of the app, used for share links, QR codes and SEO tags |
| `NEXT_PUBLIC_DEV_AUTH_BYPASS` | | Local development only; ignored in production builds |

</details>

---

## ☁️ Production Deployment

The production setup has three parts:

| Layer | Platform | What runs there |
|---|---|---|
| Frontend | **Vercel** | The Next.js app, public portfolio pages (`/p/{handle}`) and the static export route |
| Backend | **Render** | The FastAPI API, built from `backend/Dockerfile` |
| Data | **Supabase** | PostgreSQL, Auth and the private `resumes` Storage bucket |
| Portfolio hosting | **Vercel** (operator account) | One project per deployed student portfolio |

> The repository has no `render.yaml` or `vercel.json`. Both services are configured in their dashboards using the settings below. No live URLs are listed here because none are recorded in the repository.

### 1. Supabase
1. Create a project. From **Connect**, copy the **Session pooler** connection string into `DATABASE_URL`, and the project URL into `SUPABASE_URL`.
2. **Auth:** enable Email, plus **Google** and **GitHub** providers if you want OAuth. Set the **Site URL** to your Vercel URL and add `https://YOUR_APP.vercel.app/login` to the allowed redirect URLs, since OAuth returns to `/login`, where the PKCE code is exchanged for a session.
3. **Storage:** create a **private** bucket named `resumes` (or set `SUPABASE_STORAGE_BUCKET`). The backend accesses it with `SUPABASE_SERVICE_ROLE_KEY`, which stays server-side.
4. **Access policies:** the browser never queries the database or the bucket directly. It only uses Supabase for sign-in. All data access goes through the FastAPI backend, which filters every query by the verified user. Keep the bucket private and don't expose the service-role key; no public bucket policies are needed.
5. Run the migrations with `alembic upgrade head`.

### 2. Backend on Render
| Setting | Value |
|---|---|
| Runtime | **Docker** |
| Root directory | `backend` |
| Dockerfile | `backend/Dockerfile` (Python 3.12-slim, non-root user) |
| Start command | Built into the image: `uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}` |
| Pre-deploy / release | `alembic upgrade head` |
| Health check path | `/health` (liveness); `/health/ready` checks the database |
| Environment | `ENVIRONMENT=production` plus the backend variables above |
| Service URL | `https://YOUR_BACKEND.onrender.com`, which becomes the frontend's `NEXT_PUBLIC_API_BASE_URL` |

### 3. Frontend on Vercel
| Setting | Value |
|---|---|
| Repository | Import the GitHub repository into Vercel |
| Root directory | `frontend` |
| Framework preset | **Next.js** (auto-detected) |
| Install / build | `npm install` / `npm run build` |
| Output directory | Default (`.next`, managed by Vercel) |
| Environment | `NEXT_PUBLIC_API_BASE_URL` (the Render URL), `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_BASE_URL`. These are read at build time, so redeploy after changing them |
| Production deploys | With Vercel's Git integration, pushes to `main` deploy to production and other branches get preview URLs (allowed by the backend's default CORS regex for this project) |
| Custom domain | Optional: add it in Vercel → Domains, then update `NEXT_PUBLIC_BASE_URL`, `FRONTEND_ORIGIN`, `CORS_ALLOWED_ORIGINS` and the Supabase redirect URLs |

### 4. Connect frontend and backend
- Set the backend's `FRONTEND_ORIGIN` and `CORS_ALLOWED_ORIGINS` to the Vercel URL, without a trailing slash.
- Set the frontend's `NEXT_PUBLIC_API_BASE_URL` to the Render URL.
- Check that `GET /health` and `GET /health/ready` return OK, then sign in and confirm the API status in the top bar.

<details>
<summary><b>🩺 Troubleshooting</b></summary>

| Symptom | Likely cause |
|---|---|
| *"Could not reach the server"* | Wrong `NEXT_PUBLIC_API_BASE_URL`, an origin missing from `CORS_ALLOWED_ORIGINS`/`FRONTEND_ORIGIN`, or a backend 500. Check the backend logs; unhandled errors are returned without CORS headers |
| 401 on every request | `SUPABASE_URL` doesn't match the project that issued the token (issuer check), or the session expired |
| `tenant/user not found` when migrating | Wrong pooler host, region or `postgres.<project-ref>` user in `DATABASE_URL` |
| A feature fails with "relation does not exist" | Migrations not applied. Run `alembic upgrade head` |
| Uploads disappear after a redeploy | `SUPABASE_SERVICE_ROLE_KEY` not set, so files went to the container's temporary disk |
| One-click deploy returns `VERCEL_NOT_CONFIGURED` | `VERCEL_TOKEN` is missing on the backend |
| Vercel deploy can't fetch the site | `FRONTEND_ORIGIN` doesn't point to the deployed frontend, or the portfolio isn't published |
| GitHub stats rate-limited | Set `GITHUB_TOKEN`; cached data is served in the meantime |
| Ask Placey says it is resting | Gemini quota exhausted; cached answers still work |
| Frontend build fails | Missing `NEXT_PUBLIC_*` variables at build time, or the Vercel root directory isn't `frontend` |

</details>

---

## 🗂️ Project Structure

```text
ONEstopPlacement/
├── frontend/                     # Next.js 16 app (deployed on Vercel)
│   ├── app/
│   │   ├── (app)/                # signed-in area: / (home), coding, resume, prep,
│   │   │                         #   portfolio-site, portfolio, profile, settings
│   │   ├── p/[handle]/           # public, server-rendered portfolio pages
│   │   ├── api/site-export/      # static ZIP snapshot of a published portfolio
│   │   ├── login/                # sign-in, sign-up and the OAuth (PKCE) return page
│   │   └── globals.css · effects.css   # theme tokens and visual effects
│   ├── features/                 # coding · resume · interview · site-builder ·
│   │                             #   portfolio · home · profile · settings · intake
│   ├── components/               # ui kit · effects · placey · shared layout · auth
│   ├── lib/                      # API client, auth, theme, effects, navigation
│   ├── e2e/ · tests/             # Playwright + axe smoke tests · Vitest unit tests
│   └── proxy.ts                  # {handle}.domain → /p/{handle} host routing
├── backend/                      # FastAPI service (deployed on Render via Docker)
│   ├── app/
│   │   ├── main.py               # app factory, CORS, error handlers
│   │   ├── api/                  # /health and the /api/v1 router
│   │   ├── ai/                   # LLM clients, fallback chains, runner, Tavily search,
│   │   │   └── prompts/          #   13 versioned prompt files
│   │   ├── modules/              # profile · coding · resume · intake · interview ·
│   │   │                         #   site_builder · portfolio · home · feedback
│   │   ├── integrations/         # GitHub (+ cache), coding platforms, Vercel
│   │   ├── core/                 # config, JWT security, rate limits, middleware, errors
│   │   ├── db/                   # SQLAlchemy models and Alembic migrations
│   │   └── shared/               # document validation, storage (Supabase / local)
│   ├── tests/                    # offline pytest suite
│   └── Dockerfile
├── docs/                         # DEPLOYMENT · SECURITY · TESTING · ROADMAP · blueprint
└── .github/workflows/ci.yml      # backend + frontend CI
```

---

## 🛡️ Security & Configuration Notes

- 🔑 **Secrets stay server-side.** AI, GitHub, Tavily, Vercel and Supabase service-role keys live only in the backend environment. The browser only ever sees the Supabase **anon** key.
- 🪪 **Token verification:** Supabase JWTs are verified through JWKS with RS256/ES256 only (HS256 rejected), and issuer, audience, expiry and subject are checked.
- 🔒 **Per-user isolation:** every user-owned query is filtered by the signed-in user. Another user's data returns `404`.
- 🚦 **Rate limits** per user and per IP (AI calls, uploads, exports, deploys, feedback), plus a daily per-IP cap on Ask Placey.
- 🧱 **Security headers:** `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `no-store` on API responses, request IDs. CORS uses an explicit allowlist.
- 📎 **Upload checks:** file-signature validation, size limits, macro-enabled DOCX and encrypted PDFs rejected, server-generated storage keys, private storage bucket.
- 🧑‍⚖️ **Your data:** export everything as JSON or delete your account (files included) from Settings. Public portfolios never show your phone number.
- 🧪 **The dev bypass is development-only.** The backend refuses to start with it unless `ENVIRONMENT=development`, and production frontend builds ignore it.

More detail is in [`docs/SECURITY.md`](docs/SECURITY.md). These are engineering practices, not a security certification.

---

## 🏆 Project Highlights

| | |
|---|---|
| 🌐 **Resume → live website** | A PDF becomes a hosted portfolio with 6 templates, a QR code, a ZIP export and one-click Vercel deploys |
| 🎯 **JD-aware tailoring** | Requirements are extracted with word-for-word quotes and matched against your real profile |
| 🧩 **Explainable project recommendations** | GitHub READMEs are scored on the JD skills each swap gains and loses |
| ✋ **You approve every line** | A review checklist, a claim validator, flags for gaps, and a locked final version |
| 🏢 **Company-specific prep** | Day-wise plans with company DSA links and Hynts sheets for 45 companies |
| 📚 **Beyond DSA** | 109 core-CS questions with answers, questions from your own projects, and HR guidance in the STAR format |
| 🔎 **Web-grounded Ask Placey** | Tavily search plus Gemini, with cited sources and a shared cache |
| 💻 **Five coding platforms** | Live data, freshness labels and manual fallbacks |
| ✨ **Placey** | 7 modes, 3 colours and 150+ lines of encouragement |
| 🎨 **Polished experience** | 4 themes, 8 switchable effects, a command palette, reduced-motion support and a mobile layout |

---

## 🔭 Current Scope & Future Work

<details>
<summary><b>Known limitations today</b></summary>

- **Vercel deploys** go into the platform operator's Vercel account, not the student's own.
- **Long operations run synchronously** within the request (parse, analyse, deploy); there is no background job queue yet.
- **Rate limits and the GitHub cache are in memory and per process**, so they reset on restart and aren't shared between workers.
- **Interview experiences** are curated search links, not fetched content.
- **Question states:** the UI toggles questions between *to do* and *done*; the *revisit* and *skipped* states exist in the API but have no buttons yet.
- **Portfolio view counts** are recorded but not yet shown, and the Home dashboard summarises the legacy `/portfolio` module rather than the Portfolio Website.
- **Browser tests** cover public pages; signed-in flows are tested by hand.

</details>

**Planned / open** (from [`docs/ROADMAP.md`](docs/ROADMAP.md)), none of which is built yet:
- Students deploying portfolios to **their own Vercel account** through a Vercel integration.
- **GitHub Pages** publishing.
- Signed-in end-to-end browser tests.
- Measuring parse accuracy on consented real student resumes before further tuning.
- A shared store (e.g. Redis) for rate limits across workers.

---

## 🙏 Acknowledgements

ONEstopPlacement builds on excellent public work and services: **Supabase**, **Vercel**, **Render**, **Google Gemini**, **Groq** and **Tavily**; the coding communities of **LeetCode**, **CodeChef**, **Codeforces**, **HackerRank** and **GitHub**; and the preparation resources it links to, including **Hynts**, **Striver's A2Z DSA Sheet**, **NeetCode**, **GeeksforGeeks**, **Naukri Code360**, **InterviewBit** and **Levels.fyi**. All trademarks belong to their owners; links point to their public pages.

---

## 👨‍💻 About the Creator

<div align="center">

### Built with Vision by Mohit Kumar Yadav

</div>

**Mohit Kumar Yadav** is a B.Tech Computer Science and Engineering student at **Graphic Era University** who approaches software the way a competitive programmer approaches a problem: understand the constraints, then build the simplest thing that actually works. His problem-solving is shaped by competitive programming, with a **4★ rating on CodeChef**, contest experience on **LeetCode** and problem-solving achievements on **HackerRank**. Beyond engineering, he cleared the **NDA written examination** and was **recommended at the SSB**, an experience that sharpened his discipline and decision-making. ONEstopPlacement reflects his interest in AI and full-stack development: turning a frustrating, scattered student experience into a single, carefully engineered product.

<div align="center">

[![GitHub](https://img.shields.io/badge/GitHub-mohityadav24952--ai-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/mohityadav24952-ai)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Mohit_Kumar_Yadav-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/mohit-kumar-yadav-177642350/)

<br/>

⭐ **If ONEstopPlacement helps your preparation, consider starring the repository.**

</div>
