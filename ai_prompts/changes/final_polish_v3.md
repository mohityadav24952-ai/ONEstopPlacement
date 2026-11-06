# CONTEXT & GOAL
You are tasked with fixing and upgrading specific features of the "OneStop" portfolio website codebase.
CRITICAL: Read this entire document before writing any code. Do NOT touch, refactor, or modify any existing logic, UI, or styling outside of these specific tasks.

## PHASE 0: VERSION CONTROL (DO THIS FIRST)
Before changing a single line of code, run the following commands to secure the current stable state:
1. `git add .`
2. `git commit -m "chore: save stable state before major feature updates and fixes"`

## PHASE 1: FIX RESUME PARSING LOGIC (CORE FEATURE)
**Issue:** The current resume parsing logic is blindly splitting text and creating random "Project Crates" out of unrelated sentences (e.g., extracting "Branch, demonstrating leadership..." or "computed fares from Google..." as standalone projects).
**Task:**
1. Locate the logic/API route where the resume PDF is parsed and projects are extracted.
2. Refine the extraction logic (whether it's regex or an LLM system prompt) to STRICTLY identify the "Projects" section of the resume.
3. Extract exactly the actual projects (typically 3-4) with their correct Title, Tech Stack, and Description.
4. Stop it from creating fragmented crates out of bullet points or unrelated sections (like Extracurriculars or Leadership).

## PHASE 2: AUTO-GENERATE PROJECT IMAGES (FREE TIER)
**Issue:** The extracted projects look boring without images, but we cannot spend money on paid APIs.
**Task:**
1. Update the project card UI to display a cover image.
2. Implement a fallback logic for these images:
   - If the project has a live URL, use a free screenshot API like `https://image.thum.io/get/width/600/crop/800/{URL}` or Microlink.
   - If there is no live URL, use a free dynamic placeholder service. Use `https://placehold.co/600x400/1a1a1a/FFFFFF/png?text={Project+Name}` or an open-source abstract pattern generator API so it looks clean and modern.

## PHASE 3: GEMINI API PROTECTION ("ASK PLACEY" MASCOT)
**Issue:** The Gemini API key is currently used in the "Ask Placey" feature. If deployed, public users could spam it and exhaust the quota.
**Task:**
Implement a 3-layer protection in the API route handling the Gemini requests:
1. **IP-Based Rate Limiting:** Add a basic rate limiter restricting requests to 5-7 per IP per day. (Use a lightweight in-memory store, or Vercel KV / Upstash Redis if already configured).
2. **Semantic Caching / Exact Match Caching:** Cache the responses for common questions (e.g., "What are Mohit's skills?"). If a similar query hits, return the cached string instead of calling Gemini.
3. **Graceful Fallback:** Wrap the Gemini call in a try/catch block. If the API throws a quota/limit error (429), return a static, friendly message: *"Mohit's AI assistant is resting right now to avoid spam. Please check his resume or contact him directly!"*

## PHASE 4: CODING PROFILES SECTION UPDATES
**Task A: Add Codeforces**
1. Add a new card for Codeforces next to LeetCode and CodeChef.
2. Fetch the user's data using the public Codeforces API (`https://codeforces.com/api/user.info?handles={handle}` and `user.rating`).
3. Display the following stats: Current Rank, Current Rating, Highest Rating (Max), Total Contests, and Total Questions Solved.

**Task B: Update CodeChef**
1. Remove the "highest rank" (Global Rank) portion from the UI.
2. Remove the yellow warning/alert UI associated with the CodeChef section completely.

## PHASE 5: "PLACEY" MASCOT COLOR VARIANTS
**Issue:** We need slightly different aesthetics for the Placey mascot without changing any functionality.
**Task:**
1. Add two new CSS themes/variants for the mascot: a `yellowish` tint and a `pinkish` tint. (You can achieve this elegantly using CSS `hue-rotate`, CSS variables, or alternate SVGs).
2. Ensure they look cute and fit the Neon Eclipse theme.
3. Ensure the chat/bot functionality remains exactly the same.

## PHASE 6: STRICT DIRECTIVES & BOUNDARIES
- **DO NOT** rewrite the layout system.
- **DO NOT** change the Neon Eclipse theme structure.
- **DO NOT** update packages in `package.json` unless absolutely necessary for the Codeforces API call or Rate limiting (and if so, ask first).
- Validate the UI to ensure the layout does not break when the Codeforces card is added.

Execute these phases sequentially. After each phase, test the logic locally before moving to the next.