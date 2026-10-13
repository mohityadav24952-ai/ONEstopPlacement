# ONEstopPlacement

AI career copilot for placement preparation. Four integrated modules:

1. Coding Profile Intelligence Dashboard
2. JD-based Resume Intelligence and Generation
3. Company- and Job-specific Interview Preparation
4. AI Portfolio Website Generator

Status: early development (Stage 1: repository and web foundation).

## Structure

```
frontend/  Next.js frontend (TypeScript, Tailwind CSS)
backend/   FastAPI backend (added in a later stage)
docs/      Documentation (added over time)
```

## Quick start (web)

```bash
cd apps/web
npm install
npm run dev
```

Open http://localhost:3000

## Rules

- Never commit real `.env` files or API keys.
- Demo data in the UI is always labelled as demo data.