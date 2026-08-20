# Contributing

## Setup

```bash
npm install
npm run typecheck
npm test
```

## Workflow

1. Pick up an item from the roadmap in `README.md` (each source file has
   `TODO(Phase N)` comments marking unimplemented pieces).
2. Add or update tests in `tests/` alongside your change.
3. Run `npm run lint`, `npm run typecheck`, and `npm test` before opening a PR.
4. Record an entry under `[Unreleased]` in `CHANGELOG.md`.

## Fixture-based parser tests (Phase 2+)

Parser tests should run against saved HTML fixtures rather than live network
requests, so they stay fast and deterministic. Fixtures will live under
`tests/fixtures/` once Phase 2 lands.
