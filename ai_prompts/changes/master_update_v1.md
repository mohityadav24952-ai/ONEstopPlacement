# MASTER UPDATE SPECIFICATION (CRITICAL)

## PRE-REQUISITE: SAVE STATE
1. **CRITICAL FIRST STEP:** Before making any code changes, execute a `git add .` and `git commit -m "chore: save stable state before massive dashboard and resume builder revamp"`. Do not proceed until the current state is committed.

## STRICT GUARDRAILS
- **DO NOT** break or modify the internal wiring of existing functional modules.
- **DO NOT** modify the `Interview Prep` module.
- **DO NOT** break the existing functional `Portfolio Website` preview logic. 
- All new UI must match the existing dark/neon theme smoothly without layout shifts.

## PHASE 1: SIDEBAR & NAVIGATION CLEANUP
1. **Remove `Portfolio Builder`:** Completely remove the old "Portfolio Builder" module and its icon from the sidebar navigation.
2. **Replace with `Portfolio Website`:** Move the "Portfolio Website" link into the main sidebar where Portfolio Builder used to be.

## PHASE 2: AUTOMATED PROFILE & DASHBOARD DATA SYNC
1. **Trigger on Resume Parse:** When a user uploads and parses their resume in `Resume Studio` for the first time, automatically extract coding platform URLs (LeetCode, CodeChef, HackerRank, GitHub) and general profile data.
2. **Approval UI:** Route this extracted data to both the `Coding Dashboard` and `Profile` sections. 
3. **Approve/Reject All:** Instead of asking the user to approve 60-70 individual fields, implement a clean, unified "Approve All" and "Reject All" button at the top of the incoming data request modal/section.

## PHASE 3: CODING DASHBOARD REVAMP (LIVE DATA & UI)
Once the user approves the coding platform links, fetch live data with the following exact specifications. Use official brand logos and highly attractive, animated UI cards for each:
1. **LeetCode:** Fetch and display Total Questions Solved, Peak Rating (specifically render a badge/text for "Knight" if the rating qualifies), Current Rating, Total Contests attended, and Current Streak.
2. **CodeChef:** Fetch and display Peak Rating, Current Rating, Stars (render these as visually attractive purple stars matching CodeChef's style), Total Questions Solved, Total Contests, and Highest Rank Achieved globally/country-wise.
3. **HackerRank:** Fetch and display Stars specifically for Problem Solving, Java, C++, and Python.
4. **GitHub (Optimization):** Stop fetching generic/useless data like total stars on irrelevant repos. ONLY fetch actual project repositories and their `README.md` contents to understand what the project is about.

## PHASE 4: AI AGENT FOR JD-BASED RESUME BUILDER
1. **GitHub Project Integration:** When the user generates a tailored resume based on a Job Description (JD), the AI must cross-reference the required skills in the JD with the fetched GitHub projects (via their READMEs).
2. **Agentic Swap Suggestion:** If the JD requires a specific skill (e.g., React, CSS) and the user has a relevant project on GitHub that is NOT in their current base resume, the AI must provide an inline, clickable option: "Swap existing project X with GitHub project Y to match JD requirements."

## PHASE 5: RESUME TEMPLATES (OVERLEAF/SOFTWARE ENGINEER STYLE)
When generating the final resume, present the user with exactly 4 template choices:
1. **Template 1:** Overleaf/LaTeX style standard Software Engineer template.
2. **Template 2:** Tech-focused Software Intern template.
3. **Template 3:** Modern tech/startup-focused Developer template.
4. **Template 4 (Clone):** An exact visual replica of the user's originally uploaded base resume template, but with editable fields to reflect the new AI-tailored content.

## PHASE 6: PORTFOLIO WEBSITE DEPLOYMENT FIX
1. **Investigate & Fix Deployment:** The `Portfolio Website` is successfully generating templates and previews but is failing to deploy/export. Diagnose the deployment mechanism (whether it's generating a ZIP, deploying to Vercel, or creating static HTML) and fix the blocker so the user can successfully push it live.