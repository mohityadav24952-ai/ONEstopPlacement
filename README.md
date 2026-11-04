# ONEstopPlacement

AI career copilot for placement preparation. Four integrated modules:

1. Coding Profile Intelligence Dashboard
2. JD-based Resume Intelligence and Generation
3. Company- and Job-specific Interview Preparation
4. AI Portfolio Website Generator

Status: see [docs/ROADMAP.md](docs/ROADMAP.md).

## Structure

```
frontend/  Next.js frontend (TypeScript, Tailwind CSS)
backend/   FastAPI backend (SQLAlchemy, Alembic)
docs/      Blueprint and project docs
```

## Run locally

Backend (from `backend/`):

```bash
python -m venv .venv
.venv\Scripts\activate            # Windows; use source .venv/bin/activate elsewhere
pip install -r requirements.txt -r requirements-dev.txt
copy .env.example .env            # then fill in DATABASE_URL and SUPABASE_URL
alembic upgrade head
uvicorn app.main:app --reload     # http://localhost:8000/docs
pytest                            # tests use in-memory SQLite, no network
```

Frontend (from `frontend/`):

```bash
npm install
copy .env.example .env.local      # fill in the Supabase URL and anon (public) key
npm run dev                       # http://localhost:3000
```

## Rules

- Never commit real `.env` files or API keys. Only the public anon key belongs in the frontend.
- Demo data in the UI is always labelled as demo data.
- Every user-owned query is filtered by the signed-in user; other users' data returns 404.
