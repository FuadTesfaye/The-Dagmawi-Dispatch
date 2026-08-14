# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

Package manager is **bun** (`bun.lock` is the committed lockfile; an untracked `pnpm-lock.yaml` is also present locally — don't commit a second lockfile).

```bash
bun install
bun run dev      # next dev — also rewrites AGENTS.md via node_modules/next/dist/server/lib/generate-agent-files.js
bun run build
bun run lint     # eslint only
```

There is **no test framework**. `scripts/*.ts` are hand-run harnesses, executed with `npx tsx scripts/<name>.ts` (some take args, e.g. `npx tsx scripts/scrape-history.ts <channel> [limit]`).

Useful ones:

| Script | What it does |
| --- | --- |
| `scripts/seed-db.ts` | Creates every table with raw SQL — this, not drizzle-kit, is how schema actually gets applied |
| `scripts/check-db.ts` | Prints row counts, channels, recent dates, table list |
| `scripts/test-groq-pool.ts`, `test-groq-rotation.ts` | Exercise Groq key rotation / cooldown using the test helpers exported from `src/lib/groq-pool.ts` |
| `scripts/test-scrape.ts`, `test-scraper.ts` | Web-preview scraper against a channel |
| `scripts/login-userbot.js`, `convert-session.ts` | Produce a `TELEGRAM_USERBOT_SESSION` string |

**`scripts/e2e-prod.ts` and `scripts/test-all-commands-e2e.ts` drive the live deployed bot** (`@BabisummarizeBot`) by sending real Telegram messages from a userbot session. They are not local tests — running them writes to production. `test-all-commands-e2e.ts` asserts that no reply matches the known user-facing error phrases.

Three different env-loading conventions exist in `scripts/`; check the top of a script before running it:
- `import "dotenv/config"` → reads `.env`, **not** `.env.local`
- `dotenv.config({ path: ".env.local" })`
- `readFileSync('.env.local')` + regex (`check-db.ts`, `seed-db.ts`, `migrate-roast-history.ts`, `test-bot-full.ts`) — these require `DATABASE_URL="..."` **with double quotes** in the file or the regex silently yields `undefined`

Lint config disables `no-explicit-any`, `no-unused-vars`, `no-require-imports`, `prefer-const`. `tsconfig.json` excludes `scripts/`, `search-engine/`, and `cloudflare-worker/`, so `next build` does not typecheck them.

## Architecture

### Two products share one Next.js app

**1. The Dispatch** (Telegram bot) — `/` landing page, `/api/telegram` webhook, `/api/cron/*`, `/api/dispatch`, `/api/web/*`. Backed by Postgres via Drizzle (`src/db/schema.ts`).

**2. The Explorer** (Telegram channel search engine) — `/explorer/*` pages, `src/components/search-engine/`, `src/lib/search-engine/`, `/api/search-engine/*`. These routes are thin proxies over a **separate FastAPI backend** at `FASTAPI_URL` (default `http://localhost:8000`) — no Explorer data lives in this repo's Drizzle schema.

The Explorer code under `src/` is **generated**: `migrate.js` copies it out of the `search-engine/` git submodule (`search-engine` is a gitlink, currently uninitialized — the directory is empty) and rewrites imports/API paths. Re-running `node migrate.js` overwrites those directories. Prefer fixing the submodule upstream; if you must edit in `src/`, know it can be clobbered.

### Database layer (`src/db/index.ts`)

Multiple Postgres URLs are fanned out for load balancing:

- `writeDb` — **all mutations** go to `DB_URL_1` (or `DATABASE_URL`)
- `withReadDb(fn)` — preferred for selects; round-robins and **falls back through every pool, then to the primary**, on error
- `readDb()` — round-robin with no failover (older call sites still use it)
- `searchDb` — separate client used for raw SQL against the Explorer's tables (`channels`, `channel_edges`) which are **not** declared in `src/db/schema.ts`; see the `/recommend` command in `src/lib/bot.ts`
- `db` / `getDb` — deprecated aliases

`cloudflare-worker/` is an independently deployed Worker that round-robins three hardcoded Supabase URLs with retries and a circuit breaker.

### Schema changes

`drizzle.config.ts` points `out` at `./supabase/migrations`, which does not exist, and there is no migration history. In practice DDL is applied by raw SQL — `scripts/seed-db.ts`, `scripts/migrate-*.ts`, or a cron-authenticated route like `/api/cron/migrate-roast-history` that runs `CREATE TABLE IF NOT EXISTS`. **A change to `src/db/schema.ts` alone changes nothing in the database** — pair it with the corresponding DDL. `drizzle/schema.ts` is a stale leftover (`users` table) referenced by nothing.

### Ingestion — two independent paths

1. **MTProto userbot** (`src/lib/telegram/userbot.ts`) — full-fidelity, needs `TELEGRAM_API_ID/HASH/USERBOT_SESSION`, joins channels, pages with `minId` from `ingestion_cursor`. Only invoked from `/api/cron/ingest`. Surfaces `FLOOD_WAIT_*` as a thrown error.
2. **Public web-preview scraper** (`src/lib/telegram/scraper.ts`) — cheerio over `https://t.me/s/<channel>`, no auth, instant. `ensureChannelScraped()` is called on nearly every read path (`summarizeDay`, `/babiometer`, `/guess`, roasts, `/channel`), so user commands self-heal for new channels.

Both write `posts` keyed on `(channel, id)` with `onConflictDoNothing` and advance `ingestion_cursor`.

### AI layer

`src/lib/groq-pool.ts` wraps all Groq calls. It loads `GROQ_API_KEY` plus `GROQ_API_KEY_1..9`, round-robins healthy keys, and cools a key down on 429 (`GROQ_KEY_COOLDOWN_MS`, default 60s) or 401/403 (5 min), retrying on the next key. **Always call `createGroqCompletion()`** — never instantiate the Groq SDK directly.

`src/lib/summarize.ts` caches one summary per `${channel}:${localDate}` in `daily_summaries` and de-dupes concurrent requests through an in-process `inflightSummaries` map. `SUMMARY_LANGUAGE` (`"en-clean"`) is a **cache-busting version token, not a locale** — bump it whenever the prompt or output style changes, or every user keeps getting the old cached text.

`src/lib/roasts.ts` keeps the last 10 lines per channel in `roast_history`, feeds them back into the prompt as negative examples, rejects near-duplicates and >12-word output, retries once, then falls back to templates in `roast-prompts.ts`.

### Resilience and error contract

- `src/lib/concurrency-pool.ts` — in-process semaphores: `handlerPool` (100), `aiPool` (50), `scrapePool` (15), tunable via `MAX_CONCURRENT_*`. Per-instance only.
- `src/lib/rate-limiter.ts` — in-memory sliding window, **per user per command**, applied in the `bot.use()` middleware only. Public HTTP routes (`/api/dispatch`, `/api/web/*`) are unauthenticated and unthrottled even though they trigger Groq calls.
- `src/lib/human-errors.ts` — `toHumanError()` maps any throwable to one of a small set of user-safe strings so DB/Groq internals never leak. Two consequences worth knowing:
  - `summarizeDay()` **never throws** — it returns the human error string *as the summary*. Callers must use `isErrorLikeContent()` before formatting it as content (see `formatSummaryReply` in `src/lib/bot.ts`).
  - `bot.catch()` swallows everything so the webhook always returns 200 and Telegram doesn't retry.
- If you add a new user-facing error phrase, also add it to `ERROR_PHRASES` in `scripts/test-all-commands-e2e.ts`.

### Time convention

Everything is East Africa Time (UTC+3). `local_date` columns hold EAT calendar dates, and a `getEATDateStr(offsetDays)` helper is copy-pasted into `bot.ts`, `roasts.ts`, `/api/dispatch`, and each cron/web route. Never derive dates with plain `toISOString()` against UTC.

### Auth and middleware

Cron routes check `Authorization: Bearer ${CRON_SECRET}` by hand. `src/middleware.ts` runs a Supabase SSR session refresh on every non-static request, so `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` must be set even though runtime data is Postgres-first; Supabase is not otherwise used for app data.

## Environment variables

`DATABASE_URL` · `DB_URL_1..3` · `DB_POOL_MAX` · `TELEGRAM_BOT_TOKEN` · `TELEGRAM_API_ID` · `TELEGRAM_API_HASH` · `TELEGRAM_USERBOT_SESSION` · `GROQ_API_KEY` · `GROQ_API_KEY_1..9` · `GROQ_KEY_COOLDOWN_MS` · `GROQ_MAX_RETRIES` · `CRON_SECRET` · `FASTAPI_URL` · `NEXT_PUBLIC_SUPABASE_URL` · `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` · `NEXT_PUBLIC_REPO_URL` · `MAX_CONCURRENT_HANDLERS` / `_AI` / `_SCRAPES` · `SCRAPE_CONCURRENCY` (scripts only)

`src/lib/bot.ts` throws at **module load** if `TELEGRAM_BOT_TOKEN` is missing, and `src/db/index.ts` throws if no database URL is set — importing either from a script without env loaded fails immediately.

## Deployment notes

Deployed on Vercel; cron endpoints are called externally (there is no `vercel.json`). `.vercelignore` excludes `data/`, `scripts/`, and `/search-engine/` — the **leading slash matters**, since without it the pattern also matched `src/components/search-engine/` and broke the Explorer build.

## Conventions

- Bot copy uses a "royal herald" voice (see `src/lib/bot.ts` and `roasts.ts`); AI *summaries* deliberately do not — `summarize.ts` prompts for a neutral, factual news brief. Keep those separate.
- `dagmawi_babi` is the default channel everywhere; several commands branch on `isBabi` for extra-personalized copy. New features should keep working for arbitrary channels.
- Path alias `@/*` → `./src/*`.
