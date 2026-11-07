# DIRECTIVE: GIT COMMIT EXISTING FIXES & ADD UX BANNERS

## 0. MANDATORY FIRST STEP — LOCAL GIT COMMIT
Before making any new changes, run `git add .` and create a local Git commit for all the previous bug fixes (GitHub cache, resume parsing budget, settings feedback fix, and database migration).
- **DO NOT** push to remote GitHub main branch yet. Just keep the commit clean on the local branch.

## 1. CRITICAL SAFETY DIRECTIVE
- DO NOT break, refactor, or rewrite any existing functioning logic (99.9% of the code is perfectly working).
- Perform only surgical UI/UX additions as requested below.

## 2. IMPROVED API OFFLINE / SLOW NETWORK UX
- Locate the API offline banner / toast component.
- Enhance the offline message to provide clear user guidance if network latency or disconnect occurs:
  - *Message:* "Unable to connect to server. Please check your internet connection, wait a moment, or refresh the page."
  - Ensure it provides a smooth retry button.

## 3. PORTFOLIO BUILDER — DISMISSIBLE VERCEL DEPLOYMENT GUIDANCE BANNER
- In the Portfolio Builder section (top header/notice area), add a sleek, dismissible info banner.
- **Copy:** "💡 **Quick Tip:** Customise your content and template first, then click **Publish to Dashboard**. Once published, scroll to the bottom of your Dashboard to deploy your portfolio live on Vercel!"
- **Interactive Action:** Add a clean **"Got it"** (or "Understand") button on the banner.
- **Persistence:** Save the dismissed state in `localStorage` (e.g. `hasSeenVercelDeployTip: true`) so once the user clicks "Got it", it never pops up again for that user.

Run tests upon completion to ensure zero regressions.