# Roadmap and status

Source of intent: `docs/blueprint/ONEstopPlacement_Master_Project_Blueprint.pdf`.
Numbering below is the repository's own commit stages, mapped to blueprint sections.
Last reviewed: 2026-11-06.

| Stage | Scope | Status |
|---|---|---|
| 1-7 | Skeleton, UI shell, API client, DB config, migrations | Done |
| 8 | Supabase JWT verification, frontend AuthProvider, login | Done |
| 8B | Gap fixes from review (env example ignored by git, README paths, `/me`) | Done |
| 9-10 | Profile data model, API, UI, proposals/approval (blueprint Stage 2-3) | Done |
| 11 | Module 1: Coding dashboard (GitHub API, LeetCode, CodeChef, Codeforces, HackerRank connectors) | Done |
| 12 | Module 2: Resume (upload, grounded parse, JD analysis, matching, claim validator, versions, approval, ATS PDF) + UI | Done |
| 13 | Module 3: Interview prep (curated bank, deterministic planner, AI-labelled generation, progress, Ask Placey) + UI | Done |
| 14 | Module 4: Portfolio site builder (5 templates, resume -> site parsing, live stats, ZIP export) + UI | Done |
| 14B | 1-click Vercel deploy (one Vercel account for all sites, "option A") | Done; verified live |
| 15 | Integration: Home next-best-actions, staleness banners, failure isolation | Done |
| 16 | Hardening: rate limits, headers, account export/delete, auth sweep, log review, dependency audit | Done (see `docs/SECURITY.md`) |
| 17 | Deployment artifacts: Dockerfile, CI, docs | Done. Deploying the app itself is still a manual step: `docs/DEPLOYMENT.md` |

## AI providers

- Resume -> portfolio parsing: Gemini (`RESUME_PARSE_MODEL`, then `RESUME_PARSE_FALLBACK_MODELS` on the same key),
  rotating through `GEMINI_API_KEY_1`/`_2`, then Groq. If every provider fails, or none is configured, a
  rule-based parser runs, and it also fills sections a model dropped (see `fill_gaps` in `site_builder/parser.py`).
- PDF text: pypdf plain extraction with spacing repaired from its layout extraction (kerning splits such as
  "Y adav", missing spaces such as "problemsacross").
- Ask Placey: Tavily web search + Gemini (Pro first, then fallback models), cached per question.
- Other AI features run through `LLMClient` with a deterministic mock by default.

## Tests

- Backend: `pytest -q` (in-memory SQLite, mock AI, fake HTTP; no network). Includes resume layout cases from
  real student PDFs (`tests/test_resume_layouts.py`) and the Vercel client against a fake API.
- Frontend unit: `npm test` (Vitest, pure logic). Runs in CI.
- Frontend browser smoke: `npm run test:e2e` (Playwright with the installed Chrome, axe WCAG 2.1 A/AA,
  desktop and phone). Covers pages that need no sign-in: login, the sample portfolio in all 5 templates
  (`/p/demo?template=...`), 404s and the static export. Set `E2E_HANDLE=<handle>` to include a real published
  portfolio. Needs both dev servers (it starts them if they are not running). Not in CI yet.

## Deviations from the blueprint (deliberate)

- Operations are **synchronous** (parse, analyse, refresh, export, deploy) instead of background jobs with polling.
  Fine at this scale; add the Job table when work exceeds request timeouts.
- Interview search uses `ILIKE`, not Postgres full-text search (small bank).
- PDF uses ReportLab (the blueprint's stated fallback to WeasyPrint).
- Resume proposals are stored inside the version row (`change_list`) rather than a separate table.
- Interview AI "emphasis" is not used; the planner is fully deterministic.

## Open

- **Signed-in browser tests.** The Playwright suite covers public pages only; dashboard flows (upload resume,
  edit, publish, deploy) are checked by hand.
- **Parse accuracy on real resumes.** Measure fields right / wrong / missing on 10-20 consented student resumes
  before further prompt or rule changes. Known limit: words glued in the PDF itself ("engineerwith") cannot be
  repaired from the text.
- **Vercel option B** (each student deploys to their own Vercel account via a Vercel Integration). Needed once
  real students rely on the feature; option A deploys every site into the admin's account.
- **GitHub Pages / GitHub OAuth publishing** (blueprint verification tasks) is not built.
- **Rate limits are per process and in memory**: they reset on restart and do not add up across workers.
- **Public deployment of the app** (frontend + backend), with `FRONTEND_ORIGIN`, `CORS_ALLOWED_ORIGINS` and
  `NEXT_PUBLIC_*` set to the public addresses. Deliberately not done yet.

## Known issues

- Migrations are verified on SQLite in CI; the live Supabase database is used in development.
- The 8 moderate `npm audit` findings are all `minimatch` inside `eslint-config-next` (dev-only lint tooling);
  the production audit (`npm audit --omit=dev`) is clean.
- After `npm install`, restart `next dev`: a dev server left running across a dependency change was seen
  reloading pages in a loop.
