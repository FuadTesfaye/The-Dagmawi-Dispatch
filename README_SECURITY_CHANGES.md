**Security Hardening — Changes Applied**

This file summarizes low-risk hardening steps applied automatically by the agent.

- Replaced a bare `except: pass` in `app/search/meili.py` with a logged exception to improve observability and satisfy static analyzers.
- Added a pinned dependency snapshot: `search-engine/requirements.pinned.txt` to make Python dependency audits reproducible.
- Added `SECURITY_HARDENING_REPORT.md` and `scans/` summaries with full scan outputs and prioritized remediation plan.

Next recommended steps (manual or PR-level):
- Pin frontend dependencies and upgrade `next` to a patched release.
- Add rate-limiting middleware to the FastAPI app and tighten CORS configuration.
- Run `ruff --fix` and address `mypy` errors; run tests and CI.
