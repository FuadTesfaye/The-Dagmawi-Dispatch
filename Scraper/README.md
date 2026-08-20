# TeleGlance-TS

Async TypeScript client for public Telegram channels, built entirely on t.me
web previews. No API keys, no MTProto, no user account required.

> TypeScript port of the Python [TeleGlance](https://github.com/NWGKGIT/TeleGlance)
> project. Currently at **Phase 0 (scaffold)** — see the roadmap below.

## Why TeleGlance-TS?

Same philosophy as the original: a deliberately small interface for apps that
only need publicly accessible channel data and don't want Telegram API
credentials or an MTProto session.

| Capability              | TeleGlance-TS | Full Telegram API clients |
| ------------------------ | :-----------: | :------------------------: |
| Telegram API credentials |      No       |             Yes             |
| MTProto                  |      No       |             Yes             |
| Public channels          |      Yes      |             Yes             |
| Private channels         |      No       |             Yes             |
| Web-preview based         |      Yes      |             No              |
| Account/session required |      No       |          Generally           |

**Note on scope:** this only works server-side (Node.js). t.me doesn't send
permissive CORS headers, so it can't run directly from a browser.

## Installation

```bash
npm install teleglance-ts
```

## Quick start

```ts
import { TeleGlanceClient } from "teleglance-ts";

const client = new TeleGlanceClient();

const channel = await client.getChannel("nahomssandbox");
console.log(channel.title, channel.counts.subscribers);

for await (const message of client.iterMessages("nahomssandbox", { limit: 10 })) {
  console.log(message.id, message.date, message.text.slice(0, 80));
}
```

> Client methods currently throw `"not implemented yet"` — the public API
> shape is in place, but the transport/parsing logic lands in Phases 1–2.

## Roadmap

- [x] **Phase 0 — Scaffolding**: repo, tsconfig, lint/format, tests, CI.
- [ ] **Phase 1 — Transport**: fetch wrapper, retries, throttling, hooks.
- [ ] **Phase 2 — Parsing**: cheerio parsers, selector overrides, parser registry, raw HTML fallback.
- [ ] **Phase 3 — Data models**: `Channel`, `Message`, `Media` union (already stubbed in `src/models`).
- [ ] **Phase 4 — Core client**: `getChannel`, `getMessage`, `iterMessages`.
- [ ] **Phase 5 — Search & watch**: `search()`, `watch()` polling generator.
- [ ] **Phase 6 — Media**: `downloadMedia()`, `downloadBytes()`.
- [ ] **Phase 7 — Checkpointing**: `MessageCheckpoint`, `JsonCheckpointStore`.
- [ ] **Phase 8 — Proxy support**: SOCKS/HTTP proxy agents.
- [ ] **Phase 9 — CLI**: `teleglance channel|messages|download` (stubbed in `src/cli`).
- [ ] **Phase 10 — Testing**: recorded HTML fixtures, parser + integration tests, coverage.
- [ ] **Phase 11 — Docs & packaging**: API reference site, npm publish setup.

## Development

```bash
npm install
npm run typecheck   # strict TS, no emit
npm run lint         # ESLint
npm test             # Vitest
npm run build        # emit dist/
```

## Data model

- `Channel` — title, description, avatar, raw counters.
- `Message` — id, date, text, views, media list, raw HTML.
- `Media` — discriminated union: `PhotoMedia | VideoMedia | StickerMedia | PollMedia | LocationMedia`.
- `MessageCheckpoint` / `JsonCheckpointStore` — resumable scraper state.

## License

MIT
