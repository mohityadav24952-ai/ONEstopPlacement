# Roadmap and status

Source of intent: `docs/blueprint/ONEstopPlacement_Master_Project_Blueprint.pdf`.
Numbering below is the repository's own commit stages, mapped to blueprint sections.

| Stage | Scope | Status |
|---|---|---|
| 1-7 | Skeleton, UI shell, API client, DB config, migrations | Done |
| 8 | Supabase JWT verification, frontend AuthProvider, login | Done |
| 8B | Fix gaps found in review (see below) | Done |
| 9 | Profile data model + API (blueprint Stage 2) | Done, tested on SQLite |
| 10 | Profile UI (blueprint Stage 3) | Done |
| 11 | Module 1: Coding dashboard (GitHub API + manual for all 4) | Done, tested with mocked GitHub |
| 12 | Module 2: Resume intelligence + PDF | **Blocked on decisions** (AI provider, file storage) |
| 13 | Module 3: Interview prep | Not started |
| 14 | Module 4: Portfolio generator | Not started |
| 15 | Integration, hardening, deployment | Not started |

## Stage 8B findings

- `frontend/.gitignore` pattern `.env*` also ignored `.env.example`, so it was never committed. Fixed with `!.env.example`.
- `README.md` pointed to `apps/web`; the real path is `frontend/`. Fixed.
- `backend/.env.example` lacked `GITHUB_TOKEN`. Added.
- `/api/v1/me` returned only id and email; now returns profile and completeness.
- Tables created in Supabase `public` schema are reachable through the Data API with the anon key. Migrations now enable Row Level Security (no policies = deny); the API connects as owner and is unaffected.

## Known issues / deviations

- **Live database unreachable**: Supabase pooler answers "tenant/user not found" for the configured `DATABASE_URL`. Copy the exact Session pooler string from Supabase > Connect (region host and `postgres.<project-ref>` user). Migrations have only been run against SQLite so far.
- Refresh is synchronous (with cooldown), not a background job as the blueprint suggests. Acceptable for one GitHub call; revisit when Module 2 adds the job table.
- LeetCode, CodeChef, HackerRank are manual-only until verification tasks V2/V3 are resolved.
- `npm run build` was not completed here; typecheck and lint pass.
