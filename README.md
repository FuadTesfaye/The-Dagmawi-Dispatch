# The Lurkening (@lurklord_bot)

The Lurkening is a universal Telegram channel monitoring, intelligence, and AI-powered summarization platform built for the entire Telegram community.

At its core, the project ingests and indexes Telegram channel activity, stores it in Postgres, summarizes daily broadcasts using a multi-model Groq AI pool (Llama-3.3-70B), and exposes the results through **@lurklord_bot**, an avant-garde Broadsheet web app, and an interactive Channel Explorer.

---

## 🌟 What The Lurkening Does

1. **Ingest & Index Any Public Telegram Channel**: Scrapes public channel activity with auto-fallback to web preview and userbot ingestion.
2. **AI Summarization & Multi-Perspective Review**: Executive briefs, satirical roasts, fact checks, and ELI5 plain language breakdowns.
3. **The Lurkometer**: Real-time activity gauge measuring daily broadcast volume across any tracked channel.
4. **Community Inquest & Social Layer**: Real-time comment testimonies, reactions, and Telegram OIDC authentication.
5. **Channel Explorer & Network Graph**: Visual graph clusters, hub discovery, and category search.

---

## 🤖 Telegram Bot Commands (@lurklord_bot)

- `/today` — Digest of today's channel posts
- `/yesterday` — Yesterday's recap
- `/date <YYYY-MM-DD>` — Historical date archive
- `/channel <@username>` — Switch the channel you are tracking
- `/lurkometer` (alias: `/babiometer`) — Activity volume gauge
- `/roast` — Savage, unhinged roast of posting habits
- `/excuse` — Witty excuses for unread notifications
- `/guess <n>` — Daily post count wagering
- `/subscribe` & `/unsubscribe` — Daily scheduled digest delivery
- `/recommend` — Popular channels tracked by the community

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (Turbopack, App Router)
- **Runtime**: Bun
- **Database**: PostgreSQL with Drizzle ORM
- **AI Engine**: Groq API (Llama-3.3-70B-Versatile)
- **Bot Engine**: Grammy with Webhook & Long-Polling modes
- **Styling**: Avant-Garde Broadsheet & Teletype Design System (Tailwind CSS)
- **PWA**: Full Standalone PWA 2026 specification with offline ServiceWorker caching

---

## 🚀 Getting Started

```bash
# 1. Install dependencies
bun install

# 2. Configure environment
cp .env.example .env.local

# 3. Start development server
bun dev # or bun run --cwd web dev
```
