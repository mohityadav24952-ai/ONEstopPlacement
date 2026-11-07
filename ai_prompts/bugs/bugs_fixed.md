# STRICT DIRECTIVE: SAFE TARGETED BUG FIXES (ZERO-REGRESSION GUARANTEE)

## 0. CRITICAL DIRECTIVE & SAFETY RULES
- DO NOT refactor, rewrite, or modify any existing functional code outside the specific bug locations listed below. 
- 99% of the app is working perfectly; every change MUST be minimal, surgical, and backward-compatible.

## 1. GITHUB DATA SYNC & RATE LIMIT FIX
Currently, fetching GitHub repo stats fails or hits rate limits (`403 Rate Limit Reached`), and data isn't synced across modules.
- **Persistent Global Sync:** Once a user connects/fetches their GitHub handle on any page, persist the fetched JSON data in the DB/local state so that Resume Studio, Coding Dashboard, and Portfolio automatically consume the same cached data without triggering new API requests.
- **Backend API Header:** In the GitHub backend service module, attach `Authorization: Bearer <GITHUB_TOKEN>` if `GITHUB_TOKEN` is present in the server environment variables.
- **Graceful Fallback & Caching:** Implement a 1-hour backend/in-memory cache for GitHub user repos so users never get blocked by rate limits once fetched.

## 2. PORTFOLIO RESUME DATA EXTRACTION & USER FEEDBACK (UX)
When uploading/parsing a resume inside the Portfolio module, the extraction process takes time or hangs without visual feedback.
- **Enhanced Progress UX:** Add clear, friendly progress status messages during extraction (e.g., *"Reading PDF text...", "Extracting skills & experience...", "Almost there, final touches..."*).
- **Timeout & Async Handling:** Ensure the parsing endpoint handles large PDF files gracefully without timing out, returning structured fallback data if specific sections take too long.

## 3. SETTINGS FEEDBACK SECTION FIX ("Could Not Reach Server")
The Feedback form inside Settings currently throws a "Could not load/reach server" error upon submission.
- **Inspect Endpoint:** Verify the feedback route target URL (e.g., `/api/v1/feedback` or `/api/v1/settings/feedback`).
- **Fix Connection:** Ensure the request payload matches what the backend controller expects, fix CORS/auth headers if needed, and handle successful submissions with a proper success toast.

Run existing test suites upon completion to guarantee zero broken functionality.