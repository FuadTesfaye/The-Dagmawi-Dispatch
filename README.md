# The Dagmawi Dispatch

The Dagmawi Dispatch is a Telegram-first content monitoring and summary bot built around one simple idea: help people stay informed without drowning in an endless flood of channel posts.

At its core, the project scrapes Telegram channel activity, stores it in Postgres, summarizes the daily output with Groq-powered AI, and exposes the results through a custom Telegram bot. It also adds a few playful extras: daily digests, channel switching, post-count guessing, and “royal roast” commentary for the channel being tracked.

This project is especially tuned for the chaotic, high-volume posting style of channels like Dagmawi Babi, but the app is built to support multiple Telegram channels.

## What the project does

The app has three main jobs:

1. Ingest Telegram posts from tracked channels
2. Store and organize that content in a database
3. Turn the raw content into useful summaries and bot interactions

### Main user-facing features

- Daily summaries of a channel’s activity
- Support for `/today`, `/yesterday`, and `/date` commands
- Channel selection via `/channel`
- Automatic digest subscription via `/subscribe`
- Post-volume metric via `/babiometer`
- Guessing game via `/guess`
- Personalized roast generation via `/roast`
- Excuse generator via `/excuse`
- Basic webhook-based Telegram bot integration

### Main technical features

- Next.js App Router backend with API routes
- Telegram webhook handling for the bot
- Userbot-based Telegram scraping for channel history and updates
- Postgres database with Drizzle ORM
- Daily summary generation using Groq’s LLM API
- Cron-protected endpoints for ingestion and daily summarize jobs
- Multi-channel tracking via a `userChannels` table

---

## Project overview

This repository is a full-stack app with a backend-first architecture:

- Frontend: lightweight landing page for the bot experience
- Bot layer: Telegram commands and responses using `grammy`
- Data layer: Postgres database with Drizzle models
- Ingestion layer: Telegram userbot + channel polling
- AI layer: Groq summarization and roast generation
- Cron jobs: scheduled ingestion and summary generation

The app uses a humorous “royal herald” voice throughout the bot, which fits the project’s entertainment-first tone.

---

## How it works

### 1. Telegram content is scraped

The ingestion flow lives in `src/lib/telegram/userbot.ts`.

It:

- loads the configured Telegram session
- connects to Telegram with the provided API credentials
- reads the tracked channels from the database
- fetches recent messages in batches
- stores them into the `posts` table
- updates the channel ingestion cursor so new data can be pulled incrementally

This makes the app act like a lightweight Telegram monitor.

### 2. Data is stored in Postgres

The database schema is defined in `src/db/schema.ts`.

The main tables include:

- `posts` — raw Telegram posts and metadata
- `daily_summaries` — AI-generated summaries per day, per channel
- `subscribers` — people who opt in to daily digests
- `guesses` — daily guess entries for the post-count game
- `userChannels` — the selected channel per user
- `ingestionCursor` — last scraped message ID per channel

This gives the app enough state to resume from the most recently ingested post instead of re-reading everything every time.

### 3. AI summarizes what happened

The summary logic lives in `src/lib/summarize.ts`.

It:

- fetches posts for a given channel/date
- formats them into a prompt
- asks Groq for a human-readable summary
- stores the result in `daily_summaries`
- avoids regenerating if a final summary already exists

The bot then exposes this summary via Telegram commands such as `/today` and `/yesterday`.

### 4. Telegram bot handles commands

The bot code is in `src/lib/bot.ts`.

It exposes a range of commands such as:

- `/start`
- `/channel`
- `/subscribe`
- `/unsubscribe`
- `/today`
- `/yesterday`
- `/date`
- `/babiometer`
- `/roast`
- `/excuse`
- `/guess`

Each command uses the database to fetch the user’s channel preference, the relevant daily data, or their guess state.

### 5. Cron jobs keep the system fresh

The app includes API routes under `src/app/api/cron/`:

- `ingest` runs the message-fetching process
- `summarize` generates the previous day’s summary

These routes verify `Authorization: Bearer <CRON_SECRET>` before processing, which is important for production deployment.

---

## Repository structure

```text
.
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── cron/
│   │   │   │   ├── ingest/
│   │   │   │   ├── push-daily/
│   │   │   │   └── summarize/
│   │   │   ├── telegram/
│   │   │   │   ├── route.ts
│   │   │   │   └── setup/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── db/
│   │   ├── index.ts
│   │   └── schema.ts
│   ├── lib/
│   │   ├── bot.ts
│   │   ├── roasts.ts
│   │   ├── summarize.ts
│   │   └── telegram/
│   │       └── userbot.ts
│   └── middleware.ts
├── scripts/
│   └── various admin / test helpers
├── drizzle.config.ts
├── package.json
├── README.md
├── CONTRIBUTING.md
└── ...
```

Key files:

- `src/lib/bot.ts` — Telegram command bot logic
- `src/lib/telegram/userbot.ts` — channel ingestion logic
- `src/lib/summarize.ts` — Groq summary generation
- `src/lib/roasts.ts` — roast content and fallback logic
- `src/db/schema.ts` — database schema
- `src/app/api/telegram/route.ts` — webhook receiver
- `src/app/api/cron/ingest/route.ts` — ingestion cron route
- `src/app/api/cron/summarize/route.ts` — summary cron route

---

## Tech stack

- Next.js 16
- React 19
- TypeScript
- PostgreSQL
- Drizzle ORM
- Telegram bot client (`grammy`)
- Telegram userbot client (`telegram` package)
- Groq SDK for LLM summarization and roast generation
- Supabase utilities are included in the project structure, though the main runtime data flow is PostgreSQL-first

---

## Local setup

### Prerequisites

Before running the project locally, make sure you have:

- Node.js 20+
- npm
- PostgreSQL database running locally or remotely
- Telegram developer account and app credentials
- Groq API key

### 1. Install dependencies

```bash
bun install
```

### 2. Create environment variables

Create a `.env.local` file in the project root with the following variables:

```bash
DATABASE_URL=postgresql://username:password@localhost:5432/dagmawi
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_API_ID=your_telegram_api_id
TELEGRAM_API_HASH=your_telegram_api_hash
TELEGRAM_USERBOT_SESSION=your_telegram_session_string
GROQ_API_KEY=your_groq_api_key
CRON_SECRET=some_secure_random_string
```

### 3. Start the app

```bash
bun run dev
```

Then open:

```text
http://localhost:3000
```

### 4. Set the Telegram webhook

The app includes a setup endpoint:

```text
GET /api/telegram/setup
```

This configures the bot webhook to your app’s Telegram route.

### 5. Run ingestion and summary jobs

In production or a scheduled environment, you can call the cron endpoints:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/ingest
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/summarize
```

---

## Running the build and checks

```bash
bun run build
bun run lint
```

The project is set up for a standard Next.js app workflow, and linting is configured through the repo’s ESLint setup.

---

## Deployment notes

This project is designed to run as a hosted server because it depends on:

- Telegram webhook registration
- database persistence
- cron-triggered ingestion jobs
- LLM API calls

A common deployment target is Vercel or another Node-compatible serverless or server-hosted environment, but the app uses a normal Next.js backend structure, so it can also be deployed to any environment that supports Node.js + Postgres.

For production, make sure:

- `CRON_SECRET` is strong and secret
- `DATABASE_URL` points to a production Postgres instance
- Telegram webhook is configured to the correct public URL
- all credentials are kept in secure environment variables

---

## Contribution guide

We welcome contributions from developers, writers, designers, and curious users.

The best way to contribute is to keep scope small and focused. This project has a few clear areas that are usually good entry points:

- Telegram bot commands and UX improvements
- ingestion reliability and edge-case handling
- better summary prompts and summary quality
- database schema or query improvements
- cron job robustness
- frontend polish and landing page improvements
- scripts and tooling quality

### Workflow

1. Fork the repository
2. Create a feature branch
3. Make the change
4. Run the relevant checks
5. Submit a pull request with a clear description

### Local development guidelines

- keep logic separated by responsibility
- prefer small, readable functions
- maintain the project’s humor and voice in bot interactions
- avoid hardcoding channel names unless the feature is intentionally tied to a specific channel
- do not commit secrets or local credentials

### Good contribution ideas

- improve summary prompt quality
- add better date or channel error handling
- make daily digest delivery more robust
- improve the `/guess` logic or leaderboard UX
- add tests around ingestion or summarization paths
- improve documentation and onboarding

---

## Current project personality

This project is intentionally playful and built around a “royal court” theme:

- the bot speaks like a royal herald
- the app uses friendly chaos and satire
- the summary voices are exaggerated but useful

That personality is part of the project’s identity, so contributions should respect the tone while still keeping the functionality reliable and production-safe.

---

## License

This project does not currently include a license file in the repository root. If you plan to distribute or reuse it publicly, add a license before shipping externally.

---

## Final note

The Dagmawi Dispatch is a fun, useful Telegram monitoring bot built around channel tracking, AI summaries, and a strong sense of personality. It is easiest to understand as a “daily digest system for noisy Telegram channels,” and it works especially well for channels where people want a cleaner overview of what happened without scrolling through everything manually.

If you are contributing, start by understanding three things:

- how messages are ingested
- how they are stored
- how they are summarized and exposed to users

Once those pieces are clear, the rest of the project becomes much easier to work with.
