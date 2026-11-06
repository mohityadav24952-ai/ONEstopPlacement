<div align="center">

# 🎯 ONEstopPlacement

### The AI-native placement ecosystem

**Coding stats · Resume intelligence · Interview prep · A portfolio website you deploy in one click**

<br/>

![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-149ECA?style=for-the-badge&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)

![FastAPI](https://img.shields.io/badge/FastAPI-Python_3.12-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Pydantic](https://img.shields.io/badge/Pydantic-v2-E92063?style=for-the-badge&logo=pydantic&logoColor=white)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)

![Gemini](https://img.shields.io/badge/Gemini-LLM-8E75B2?style=flat-square&logo=googlegemini&logoColor=white)
![Groq](https://img.shields.io/badge/Groq-fallback-F55036?style=flat-square)
![Tests](https://img.shields.io/badge/backend_tests-400%2B_passing-2ea44f?style=flat-square&logo=pytest&logoColor=white)
![Playwright](https://img.shields.io/badge/e2e-Playwright_+_axe-2EAD33?style=flat-square&logo=playwright&logoColor=white)

</div>

---

## ✨ What it is

ONEstopPlacement is one place for a student's whole placement journey. Sign in once, and the app:

- 📊 pulls your **coding profiles** (GitHub, LeetCode, Codeforces, CodeChef, HackerRank) into one dashboard;
- 📄 reads your **resume**, matches it to a **job description**, and drafts tailored versions you approve line by line;
- 🎤 builds an **interview plan**, with core-subject answers, DSA practice sheets and *Ask Placey*, an AI helper that cites the web;
- 🌐 turns your resume into a **live portfolio website**: pick one of 6 templates and a mascot, then **deploy to Vercel in one click**.

> **Design rule:** the AI is a helper, never the source of truth. Anything the AI writes is checked against what you actually wrote, and nothing goes public until you approve it.

---

## 🚀 Core features

### 🧠 Strict-schema AI resume parsing
Most "AI resume parsers" ask a model for JSON and hope for the best. Here, that answer goes through several checks:

| Layer | What it does |
|---|---|
| **Strict schema** | The model must answer in a Pydantic schema that keeps `projects`, `coding_profiles`, `achievements_and_leadership` and `certifications` apart. The schema is sent to the provider (Gemini `responseJsonSchema`, Groq strict `json_schema`), so the model is constrained while it generates. |
| **Verbatim grounding** | Every string must appear in the resume text. If a bullet was reworded, the original wording from the PDF is shown instead. Invented projects are dropped. |
| **Adapter / mapper** | Plain Python maps the strict answer onto the portfolio shape the frontend renders, so the model never has to know the UI's format. |
| **Fallback chain** | Gemini key 1 → lighter Gemini models → key 2 → Groq → a rule-based parser. An upload always produces a draft. |
| **Gap filling** | If a model drops a section, it is restored from the rule-based parse of the same text. |

### ⚡ 1-click Vercel deployment
Publish, press **Deploy**, and get a live `*.vercel.app` URL:

```
Next.js renders /p/{handle}  ──►  static ZIP (scripts stripped, fonts and CSS inlined)
      ──►  FastAPI validates the ZIP (paths, size, file count)
      ──►  Vercel REST: upload files by SHA-1  ──►  create production deployment
      ──►  UI polls status  ──►  resolves the project's production domain  ──►  🎉 live link
```

### 🎨 Dynamic Next.js portfolios
- **6 templates:** *Neon 3D Dev* (flagship), Blueprint, DevOS, Neural Bento, DevSearch, ShipLog Brutalist.
- **5 animated mascots** plus accent colours and light/dark mode.
- Public pages are **server-rendered** at `/p/{handle}`, with OpenGraph metadata; the owner's phone number is never shown.
- Every template is checked with **axe (WCAG 2.1 AA)** and for sideways scroll at phone width.

### 🐍 Python FastAPI backend
- Supabase **JWT verification** (RS256/ES256 via JWKS); every query is filtered to the signed-in user.
- A **provider-neutral LLM layer** (Gemini, Groq, OpenAI, plus a deterministic mock for tests). Prompt files are versioned, and an **audit row** records every AI call (no prompt text stored).
- **Rate limits** per user and per IP, security headers, upload checks by magic bytes, account export and deletion.
- **400+ backend tests** that run offline: in-memory SQLite, with every external API mocked.

---

## 🧰 Tech stack

<table>
<tr><td valign="top" width="50%">

**🖥️ Frontend**
- ⚛️ Next.js 16 (App Router) + React 19
- 🟦 TypeScript 5
- 🎨 Tailwind CSS 4 (CSS-first tokens, 4 themes)
- 🔐 Supabase Auth (email, Google, GitHub, PKCE)
- 🧪 Vitest · Playwright · axe-core

</td><td valign="top" width="50%">

**⚙️ Backend**
- 🐍 Python 3.12 · FastAPI · Pydantic v2
- 🗄️ SQLAlchemy 2 + Alembic
- 🐘 PostgreSQL on Supabase (SQLite for local dev and tests)
- 📄 pypdf · python-docx · ReportLab
- 🧪 pytest with `httpx.MockTransport`

</td></tr>
<tr><td valign="top">

**🤖 AI & data**
- Google Gemini (key rotation and model fallback)
- Groq (`gpt-oss-120b`) as a fallback provider
- Tavily web search for *Ask Placey*
- LeetCode GraphQL, GitHub REST, Codeforces API

</td><td valign="top">

**☁️ Infrastructure**
- Vercel (frontend and 1-click portfolio deploys)
- Docker (backend image, non-root)
- Supabase (Postgres, Auth, private Storage)

</td></tr>
</table>

---

## 🗂️ Project structure

```
ONEstopPlacement/
├── frontend/              # Next.js app
│   ├── app/               # routes: (app) dashboard, /p/[handle], /api/site-export
│   ├── features/          # coding · resume · interview · site-builder · home · settings
│   ├── components/        # UI kit, effects, shared layout
│   └── lib/               # API client, auth, theme, effects
├── backend/               # FastAPI app
│   ├── app/ai/            # LLM clients, fallback chains, versioned prompts, runner
│   ├── app/modules/       # profile · coding · resume · interview · site_builder · home · intake
│   ├── app/integrations/  # GitHub, coding platforms, Vercel
│   └── tests/             # 400+ offline tests
└── docs/                  # roadmap, deployment, security, testing
```

---

## 🏁 Quick start

**You need:** Python 3.12+, Node.js 20+, and a free [Supabase](https://supabase.com) project (for auth and Postgres).

### 1. Backend (terminal 1)

```bash
cd backend
python -m venv venv
venv\Scripts\activate                 # Windows  ·  macOS/Linux: source venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
copy .env.example .env                # macOS/Linux: cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload         # → http://localhost:8000/docs
```

### 2. Frontend (terminal 2)

```bash
cd frontend
npm install
copy .env.example .env.local          # macOS/Linux: cp .env.example .env.local
npm run dev                           # → http://localhost:3000
```

### 3. Configure (`.env` files, never committed)

| Where | Variable | Needed for |
|---|---|---|
| backend | `DATABASE_URL`, `SUPABASE_URL` | database and sign-in |
| backend | `GEMINI_API_KEY_1`, `GEMINI_API_KEY_2`, `GROQ_API_KEY` | AI resume parsing (optional: a rule-based parser runs without them) |
| backend | `TAVILY_API_KEY` | live *Ask Placey* answers |
| backend | `VERCEL_TOKEN`, `FRONTEND_ORIGIN` | 1-click deploy |
| frontend | `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | API and sign-in (anon key only) |

> 💡 With `LLM_PROVIDER=mock`, every AI feature runs on a deterministic mock, so you can try the app with **no API keys at all**.

### 4. Test

```bash
cd backend  && pytest              # offline: in-memory SQLite, every external API mocked
cd frontend && npm test            # unit tests
cd frontend && npm run test:e2e    # Playwright + axe accessibility checks
```

📦 Deploying to production? See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

---

## 🛡️ Ground rules

- 🔑 **Never commit real `.env` files or API keys.** Only the public Supabase anon key belongs in the frontend.
- 🏷️ Demo data is always labelled as demo data.
- 🔒 Every user-owned query is filtered by the signed-in user; other users' data returns `404`.
- ✋ AI output is a draft: grounded against your own text, and published only after you approve it.

More in [`docs/SECURITY.md`](docs/SECURITY.md) · status in [`docs/ROADMAP.md`](docs/ROADMAP.md).

---

<div align="center">

Built by **[@mohityadav24952-ai](https://github.com/mohityadav24952-ai)** · ⭐ Star the repo if it helped you prepare!

</div>
