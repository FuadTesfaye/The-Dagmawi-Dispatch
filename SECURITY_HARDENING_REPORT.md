**Security Hardening Report**

Summary of automated scans and next steps for hardening and resilience.

- **Scans run:** `pip-audit`, `bandit`, `safety`, `ruff`, `mypy` on the Python app; `npm audit`, `eslint`, `tsc` on the frontend.
- **Saved scan summaries:** [scans/python_scan_summary.txt](scans/python_scan_summary.txt) and [scans/npm_audit_summary.txt](scans/npm_audit_summary.txt)

High-level findings
- Python (Bandit): binding to `0.0.0.0` in `app/config.py`, non-crypto RNG usage in `app/ingestion/throttle.py`, `except: pass` in `app/search/meili.py`.
- Python (Safety/pip-audit): 0 reported vulnerabilities but warnings about unpinned packages (`python-dotenv`, `pydantic-settings`).
- Frontend (npm audit): critical/high advisories affecting `next` (version 14.2.15) and `nanoid` — upgrade/pin required.
- Static analysis: `ruff`/`mypy` reported import ordering, nested-with simplifications, and type errors in `app/analysis/scoring.py`, `app/analysis/analyzer.py`, and `app/db/database.py`.

Prioritized patch plan (recommended order)
1. Pin dependencies (Python `requirements.txt`, frontend `package.json`) and re-run audits. (low-risk, high-impact)
2. Upgrade `next` to a patched version (follow changelog & test). (frontend critical)
3. FastAPI hardening:
   - Tighten CORS origins (do not default to `*`), hide docs in prod, and ensure `allow_methods` limits remain.
   - Add rate limiting middleware (e.g. `slowapi` or `starlette-limiter`) on API endpoints and on cron/dispatch routes.
4. Add security headers in the frontend runtime (CSP, HSTS, X-Frame-Options) using Next.js middleware or Caddy/Traefik config.
5. Database resilience:
   - Increase pool sizes for expected concurrent load (50 users) and set sensible timeouts.
   - Ensure `get_conn()` handles connection errors gracefully and add exponential backoff where external services are used.
6. Fix Bandit findings:
   - Avoid binding admin services to `0.0.0.0` unless behind a trusted proxy; make host configurable.
   - Replace `random.uniform` for security-sensitive delays with `secrets` if needed for unpredictability.
   - Replace bare `except: pass` with explicit exception handling and logging.
7. Meili/Postgres failover: ensure Meili errors are logged but non-fatal, and add a healthcheck + retry/backoff for indexing operations.
8. Cloudflare Worker: add rate-limiting, origin verification and circuit-breaker behavior when backends fail.
9. Add tests & CI gates: run `pip-audit`, `npm audit`, `ruff --fix`, `mypy`, and unit tests as part of CI; block merges on critical vulnerabilities or type errors.
10. Run load tests targeting 50 concurrent users (use `k6` or `wrk`) and tune pool sizes, worker counts, and caching.

Files to change (examples)
- `requirements.txt` — pin versions.
- `search-engine/web/package.json` — upgrade/pin `next`, `nanoid`, etc.
- `app/api/main.py` — add rate limiting and tighten CORS.
- `app/config.py` — make `api_host` configurable and document safe defaults.
- `app/ingestion/throttle.py` — use `secrets` or log decisions; preserve FloodWait behavior.
- `cloudflare-worker/src/index.ts` — add simple rate limiting and health checks.

Next actions I can take for you (pick one):
- I can apply the low-risk fixes now (pin deps in `requirements.txt`, run `ruff --fix`, replace `except: pass` with logging). (recommended first)
- I can create PR-ready patches for the higher-impact changes (rate limiting, Next.js upgrade, DB pool tuning) and run unit/load tests locally.
- I can run a focused load test (50 concurrent users) against a staging endpoint you provide.

See full scan summaries: [scans/python_scan_summary.txt](scans/python_scan_summary.txt) and [scans/npm_audit_summary.txt](scans/npm_audit_summary.txt)

-- End of report
