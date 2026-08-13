# Contributing to The Dagmawi Dispatch

Thanks for being interested in contributing to this project. This repository is a Telegram-based channel summary bot with a strong personality, and the goal is to keep it useful, readable, and fun without breaking production behavior.

This guide explains how to contribute clearly and how to work with the project structure.

---

## Project summary

The Dagmawi Dispatch ingests Telegram channel content, stores it in a Postgres database, and summarizes the data using Groq-powered AI. The bot exposes this output to users through Telegram commands and cron-based jobs.

In practical terms, the project is made up of:

- Telegram bot logic in `src/lib/bot.ts`
- Telegram channel scraping in `src/lib/telegram/userbot.ts`
- AI summaries in `src/lib/summarize.ts`
- roast generation in `src/lib/roasts.ts`
- database schema in `src/db/schema.ts`
- webhook and cron endpoints in `src/app/api/`

---

## Before you contribute

### 1. Read the project docs

Start with the main README so you understand the app’s purpose and architecture.

### 2. Understand the runtime flow

The general flow is:

1. Messages are fetched from Telegram channels
2. Data is saved to Postgres
3. Summary logic reads the stored data
4. Bot commands respond with summaries, roasts, or metrics
5. Cron routes keep the system refreshed

That mental model will make most code changes easier to understand.

---

## Local setup

### Install dependencies

```bash
npm install
```

### Environment variables

Create `.env.local` with the required variables:

```bash
DATABASE_URL=postgresql://username:password@localhost:5432/dagmawi
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_API_ID=your_telegram_api_id
TELEGRAM_API_HASH=your_telegram_api_hash
TELEGRAM_USERBOT_SESSION=your_telegram_session_string
GROQ_API_KEY=your_groq_api_key
CRON_SECRET=some_secure_random_string
```

### Run the app

```bash
npm run dev
```

---

## Suggested contribution workflow

### Branching

Use a feature branch for your work:

```bash
git checkout -b feature/your-change-name
```

Keep the change focused on one concern.

### Keep PRs small

Good PRs are usually:

- one specific feature or fix
- clearly described in the PR body
- easy to review
- tested or sanity-checked locally

### Write clear commit messages

Use straightforward messages like:

- `feat: add date-based channel summary command`
- `fix: handle empty Telegram channel fetch gracefully`
- `refactor: improve summary prompt formatting`
- `docs: add contributor setup instructions`

---

## Good contribution areas

These are great places to start:

### Bot experience

- command UX improvements
- clearer command responses
- better fallback handling for unknown commands
- improved helper functions and command validation

### AI and summaries

- better prompt quality
- improved filtering or grouping of content
- more helpful error messaging when the summary fails
- better language handling and production safety

### Data ingestion

- avoid duplicate inserts
- handle Telegram errors more gracefully
- improve cursor handling for message gaps
- add logging around failed channel scrapes

### Database and schema

- cleaner models for new features
- indexing improvements
- migration safety and schema consistency

### Frontend and docs

- better landing page
- clearer onboarding experience
- documentation improvements
- examples of common workflows and deployment patterns

---

## Development principles

Please try to follow these project conventions:

- keep code readable and explicit
- prefer small functions and helpers over large monolithic logic blocks
- respect the current “royal herald” voice in bot output
- avoid committing secrets or local environment data
- keep production paths compatible with the existing deployment style
- do not over-engineer simple fixes

---

## Testing and validation

Before opening a PR, run relevant checks:

```bash
npm run build
npm run lint
```

If you edit a critical flow such as Telegram ingestion or summary generation, it is also good to do a focused manual test using your local environment and relevant commands.

---

## Pull request expectations

When you open a PR, include:

- a short summary of the change
- why the change is needed
- what was tested
- any migration or environment changes
- any follow-up work that remains

A strong PR description usually looks like this:

```md
## Summary
Improves daily summary generation for channels with empty post sets and updates the user-facing error message.

## Changes
- adds a guard for empty post lists
- returns a clearer message in the Telegram bot
- preserves the existing summary cache behavior

## Validation
- `npm run build`
- `npm run lint`
```

---

## Code review etiquette

- be constructive and specific
- explain the reasoning behind design choices
- keep feedback focused on the code and behavior
- respect the project tone while still being professional

---

## Legal and security note

This project interfaces with Telegram APIs, external LLM providers, and a database. Please be careful with:

- secrets and tokens
- webhook URLs and cron authorization
- user data handling
- logs that might expose raw Telegram messages or personal data

Do not commit credentials or share them in issue comments or PRs.

---

## Need help?

If you are unsure where to start, the simplest path is:

1. read the README and bot architecture
2. choose a small bug or UX improvement
3. open a PR with a focused change

You do not need to be an expert to contribute. The project benefits from small, practical improvements.

Thank you for helping improve The Dagmawi Dispatch.
