# Testing

```bash
cd backend && pytest          # ~100 tests, in-memory SQLite, mock AI, no network
cd frontend && npx tsc --noEmit && npm run lint
```

## What is covered

- **Isolation**: each module has a "user B cannot read/change/delete user A's item" test returning 404.
- **Auth sweep**: every `/api/v1` operation returns 401 without a token.
- **Connectors**: GitHub normaliser and failure modes (404, rate limit, 5xx, malformed body, timeout) with mocked HTTP; manual entry; stale fallback; snapshot pruning.
- **AI workflows**: scripted clients return malformed JSON, schema violations, invented facts, provider errors, timeouts. Expected: one retry, then a safe failure with a user-friendly code (`AI_OUTPUT_INVALID`, `AI_UNAVAILABLE`) and the manual path still available.
- **Validators**: adversarial cases for invented numbers, skills, employers, stuffing, bad evidence IDs (resume); ungrounded quotes (JD); company-claims and duplicates (interview); URLs/contacts/skills (portfolio).
- **Files**: PDF/DOCX happy path, wrong type, macros, oversize, unreadable, no-text, traversal-style filenames, deletion removes files.
- **Planner determinism**, provenance labels, consent hash binding, immutable approved versions, ATS PDF text extraction.

## Not covered (do before release)

- Real database: tests use SQLite. Run `alembic upgrade head` and the suite shape against Supabase Postgres once `DATABASE_URL` works.
- Real AI provider output quality, real GitHub API.
- Browser end-to-end tests (Playwright) and an automated accessibility scan.
- Load testing.
