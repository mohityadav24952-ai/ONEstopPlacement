# Security notes

Checklist status against Blueprint Sec. 15. "Tested" means an automated test in `backend/tests`.

| Control | Status |
|---|---|
| Every product endpoint needs a verified bearer token (RS256/ES256 via Supabase JWKS; HS256 rejected) | Tested: `test_every_product_route_requires_auth` walks every `/api/v1` route from the OpenAPI schema |
| Owner filtering on every resource; other users get 404 | Tested per module (profile, coding, resume, interview, portfolio) |
| User ID comes from the token, never from request data; unknown/identity fields rejected | Tested (`extra="forbid"` schemas) |
| Supabase Data API exposure: Row Level Security enabled on all tables, no policies | In migrations. Verify in the Supabase dashboard after first migration (see Human Todo) |
| Upload checks: size cap, magic bytes, extension, macro DOCX rejected, encrypted/scanned PDFs rejected, filenames never used as paths | Tested |
| Prompt injection: untrusted text is wrapped in a data block that cannot be closed by its own content; model output is only a proposal, validated by code, and never writes to the profile | Tested (`test_ai.py`, `test_resume_documents.py`) |
| AI cannot invent facts: resume claim validator, parse grounding against source text, portfolio text validator, interview company-claim stripping | Tested (adversarial set in `test_resume_versions.py`) |
| Portfolio output is static: no JS, HTML-escaped, CSP meta, sandboxed preview, sensitive fields opt-in, consent hash binds approval to exactly what was reviewed | Tested |
| No secrets/PII in logs: AIRun stores hashes and counts only; request log has method/path/status | Tested (`test_no_resume_text_jd_or_tokens_in_logs`) |
| Rate limits (uploads, AI calls, platform calls, exports) per user | Tested. In-memory per process: use a shared store if you run several workers |
| Security headers (`nosniff`, `X-Frame-Options`, `Referrer-Policy`, `no-store` on API) | Tested |
| Deletion: uploaded files, PDFs, ZIPs and all rows removed on account deletion | Tested |
| Dependency audit | `pip-audit`: clean. `npm audit --omit=dev`: Next.js advisories fixed by upgrading to 16.4.5 |

## Known limitations

- Rate limiting is per process (see above).
- Deleting an account removes your data from this app's database. The Supabase *auth* user is not deleted (needs the service-role key). Delete it from the Supabase dashboard, or add a server-side admin call.
- AI quality was only exercised with the deterministic mock adapter and scripted fakes. Run the workflows with a real model and review outputs before relying on them.
- GitHub contribution calendar, LeetCode, CodeChef and HackerRank integrations are not implemented (manual entry only) pending verification tasks V1-V3.
- GitHub/Vercel auto-publish for portfolios is not implemented. Export is a ZIP the user publishes manually.
- Accessibility was not audited with a tool (axe/Lighthouse); do this in the browser.
