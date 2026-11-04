# Roadmap and status

Source of intent: `docs/blueprint/ONEstopPlacement_Master_Project_Blueprint.pdf`.
Numbering below is the repository's own commit stages, mapped to blueprint sections.

| Stage | Scope | Status |
|---|---|---|
| 1-7 | Skeleton, UI shell, API client, DB config, migrations | Done |
| 8 | Supabase JWT verification, frontend AuthProvider, login | Done |
| 8B | Gap fixes from review (env example ignored by git, README paths, `/me`) | Done |
| 9-10 | Profile data model, API, UI, proposals/approval (blueprint Stage 2-3) | Done |
| 11 | Module 1: Coding dashboard (GitHub API + manual for all 4 platforms) | Done |
| 12 | Module 2: Resume (upload, grounded parse, JD analysis, matching, claim validator, versions, approval, ATS PDF) + UI | Done |
| 13 | Module 3: Interview prep (curated bank, deterministic planner, AI-labelled generation, progress) + UI | Done |
| 14 | Module 4: Portfolio (themes, AI text validation, privacy checks, consent, ZIP export) + UI | Done (P0). GitHub/Vercel publishing not built |
| 15 | Integration: Home next-best-actions, staleness banners, failure isolation | Done |
| 16 | Hardening: rate limits, headers, account export/delete, auth sweep, log review, dependency audit | Done (see `docs/SECURITY.md`) |
| 17 | Deployment artifacts: Dockerfile, CI, docs | Done. Actual deployment is a manual step: `docs/DEPLOYMENT.md` |

## Deviations from the blueprint (deliberate)

- AI runs through `LLMClient` with a deterministic **mock** by default; OpenAI and Gemini adapters exist (via `httpx`) but have never been run against the real APIs.
- Operations are **synchronous** (parse, analyse, refresh, export) instead of background jobs with polling. Fine at this scale; add the Job table when work exceeds request timeouts.
- Interview search uses `ILIKE`, not Postgres full-text search (small bank).
- PDF uses ReportLab (the blueprint's stated fallback to WeasyPrint).
- Resume proposals are stored inside the version row (`change_list`) rather than a separate table.
- Interview AI "emphasis" is not used; the planner is fully deterministic.
- LeetCode, CodeChef, HackerRank connectors, GitHub OAuth publishing and Vercel API deployment are not implemented (verification tasks V1-V3, V6, V7 unresolved).

## Known issues

- Live Supabase database was unreachable during development (`tenant/user not found`); migrations were verified on SQLite only.
- No browser E2E tests or automated accessibility audit.
