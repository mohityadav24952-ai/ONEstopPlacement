# Deployment

Target: frontend on Vercel, backend as a container (Render, Railway, Fly.io or similar), database and auth on Supabase.

## Environment variables

Backend (`backend/.env.example` lists all):

| Variable | Notes |
|---|---|
| `ENVIRONMENT` | `production` disables `/docs` and `/openapi.json` |
| `DATABASE_URL` | Supabase **Session pooler** string (exact host and `postgres.<project-ref>` user from Supabase > Connect) |
| `SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `CORS_ALLOWED_ORIGINS` | Your Vercel URL(s), comma separated, no trailing slash |
| `LLM_PROVIDER`, `LLM_MODEL`, `OPENAI_API_KEY` / `GEMINI_API_KEY` | `mock` works with no key |
| `GITHUB_TOKEN` | Optional, fine-grained, public read only |
| `STORAGE_DIR` | Needs persistent disk. Local disk is for development and single-instance hosting only; move to object storage before scaling |

Frontend (Vercel project settings): `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (public key only).

## Steps

1. Run migrations as a release step: `alembic upgrade head`.
2. Build and deploy `backend/Dockerfile`; set the variables above.
3. Deploy `frontend/` to Vercel (root directory `frontend`).
4. Set the backend `CORS_ALLOWED_ORIGINS` to the Vercel URL.
5. Smoke test (below).

## Smoke checklist

- `GET /health` and `GET /health/ready` return ok.
- Sign up, confirm email, sign in. The top bar shows API online.
- Edit profile, connect GitHub, upload a resume and parse it, analyse a JD, approve a resume and download the PDF.
- Create an interview plan. Create a portfolio, approve it, export the ZIP and open it locally.
- Export data, then delete a throwaway account.

## Rollback

Redeploy the previous backend image and the previous Vercel deployment. Migrations are additive; downgrade with `alembic downgrade -1` only if no new data depends on the change.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Browser shows "Could not reach the server" | Wrong `NEXT_PUBLIC_API_BASE_URL` or `CORS_ALLOWED_ORIGINS` |
| 401 on every call | `SUPABASE_URL` mismatch (issuer check) or expired session |
| `tenant/user not found` on migrate | Wrong pooler host/region or user in `DATABASE_URL` |
| Uploads vanish after redeploy | `STORAGE_DIR` is not on a persistent volume |
