---
title: Fengi
emoji: 🍄
colorFrom: blue
colorTo: purple
sdk: docker
app_port: 7860
---

# Fengi

Five instant-play browser games with shared daily editions, seeded practice, a seven-day archive and recoverable progress. Built with Next.js, React, Phaser 4.2.1 and strict TypeScript. Gameplay works without an external account or NVIDIA key. SQLite stores anonymous profiles and progress on the server; browser caching covers temporary interruptions.

- **Signal Grid:** solver-verified, uniquely solvable circle/cross grids.
- **Orbit Tap:** fixed-step arcade with reversal, pulsing gates, three lives, pause/resume and calm practice.
- **Odd Answer:** three curated prompts with explicit aliases and transparent editorial scoring.
- **Trail Trace:** seeded gardens with three collectibles and a solver-proven shortest route.
- **Pair Bloom:** seeded memory decks with eight matching pairs and saved progress.

## Run locally

Use Node **26.13.0 LTS** (`.nvmrc`). Versions are pinned; install from the lockfile.

The SQLite driver can compile a native module during installation. Have Python 3 and a C++ build toolchain available (on Linux, `make` and `g++`). In restricted workspaces, set `npm_package_config_node_gyp_devdir` to a writable build-cache directory; the default is under your home directory. CI verifies a fresh installation on Ubuntu.

```bash
nvm install
nvm use
npm ci
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. The blank `.env.local` key is intentional. All five games work without it. Use `npm run build` and `npm start` for the production server. Both servers bind to loopback by default. Public production binding requires the trusted-ingress configuration in the operations guide.

## Quality checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium --with-deps
npm run test:e2e
npm audit --omit=dev
```

Browser tests start the production server, so build first. CI runs the same checks on desktop and mobile Chromium. Formatting: `npm run format`. If your environment restricts the default npm cache, set `npm_config_cache` to a writable directory. For Playwright caches, use `PLAYWRIGHT_BROWSERS_PATH` consistently during installation and testing.

## NVIDIA and LangChain

This is **private content authoring**, not a public model endpoint or live gameplay judge. Set these only in server-side `.env.local`:

```dotenv
NVIDIA_API_KEY=your_key_here
NVIDIA_MODEL=your_configured_model_id
FENGI_AI_ENABLED=true
```

Private authoring defaults on when `FENGI_AI_ENABLED` is unset; set it to `false` to disable. Both NVIDIA values must be configured on the server. The adapter reads `NVIDIA_MODEL` at runtime and never substitutes a different model. Missing credentials or model configuration return an explicit deterministic fallback.

Run `npm run content:verify-live` to make two bounded calls through the real LangChain adapter. It succeeds only for NVIDIA-sourced, validated responses; fallback exits nonzero. It prints only status/counts and neither saves nor publishes generated content. This command consumes provider quota.

For persisted drafts, `npm run content:draft` aliases the rights-gated editorial workflow. Set an approved `FENGI_AI_RIGHTS_REFERENCE` and follow [generation, review and publication](docs/EDITORIAL.md). Source provenance distinguishes real NVIDIA generation from deterministic fallback. Answers and scores stay canonical.

LangChain `ChatOpenAI` uses NVIDIA Chat Completions, streaming, a 4,096-token budget, explicit low reasoning, a 60-second request timeout, a 90-second abort and at most one retry. LangChain `JsonOutputParser` parses complete output before strict schema and category validation. Truncated output and extraneous prose fail closed. Live validation passed with the configured Mistral model; this does not establish production rights or service availability.

## Structure

```text
src/app/                  App Router routes, metadata, global styles, health endpoint
src/components/           Product shell, shared results, save lifecycle, navigation
src/games/<game>/v1/       Retained v1 rules, content and views
src/games/releases/        Pure command reducers, versioned validators and frozen PRNG
src/games/runtime/         Disposable Phaser scenes and renderer-independent contracts
src/games/registry.ts      Game metadata and versioned session identities
src/lib/persistence.ts    Validated browser cache and legacy save import
src/server/               SQLite store, API security, save validation, private LangChain
scripts/                  Offline operator tools
tests/unit/              Engine, content and persistence tests
tests/e2e/               Real gameplay, reload, mobile and failure-flow tests
```

See [the implementation plan](docs/FENGI-PLAN.md) for product decisions, verified stable versions and scale-up boundaries; [the engine decision](docs/ENGINE-ARCHITECTURE.md) for maintenance evidence and the React/Phaser boundary; [operations](docs/OPERATIONS.md) for deployment preparation, content versioning, recovery and remaining production work.

## Scope and data

Progress is saved to `.data/fengi.sqlite` and cached locally. The production startup script keeps that path outside the generated build. Use a persistent local volume; an ephemeral/serverless filesystem will lose data. `FENGI_DATABASE_PATH` can select an absolute path; set `FENGI_ORIGIN` to the exact public HTTPS origin and `FENGI_CLIENT_IP_HEADER` to a proxy-overwritten single-IP header behind a trusted reverse proxy. These have local defaults and need no external credentials.

Your progress includes one-time recovery codes, profile deletion and a JSON export. Recovery codes grant profile access: keep them private. Same-game browser tabs have one editor; server revisions reject stale device writes and provide an explicit conflict flow. Unsynced local records are retained for recovery. Old browser-only v1 saves load on their original engine and import when played.

```bash
npm run db:backup -- /absolute/backup/path/new-bundle
npm run db:verify -- /absolute/backup/path/new-bundle
npm run db:cleanup # dry run; -- --apply removes only eligible empty provisional profiles
```

See the operational restore procedure before restoring a database. This is a single-node SQLite deployment, not a horizontally distributed persistence service. Anonymous scores remain untrusted for rankings. New route loads need the server; there is no service worker. Odd Answer still has a finite eight-category v1 catalogue.

This repository contains the new Fengi app only. The obsolete Alchemy Arena app, design exports, prototype, infrastructure and Pages deployment workflow have been removed; their history remains in Git. The current app requires a Node server and is not a static Pages export. CI validates changes but does not deploy them.

## Reviewed AI collections and Spaces

See [Editorial operations](docs/EDITORIAL.md) for generation, rights review, approval, publication and revocation. See [Hugging Face hosting](docs/HUGGINGFACE.md) for Docker configuration and explicit persistence limits. No deployment is automatic.


### Reviewed AI practice packs

The private `content:editorial -- generate-pack` command requests game-specific NVIDIA candidates for all five games: Signal Grid patterns/clues, Pair Bloom deck layouts, Orbit Tap targets/gate phases/speed, Trail Trace walls/seeds, and Odd Answer prose/category selection. Strict validation and trusted solvers/rules precede operator review and publication. New practice editions save and resume through the existing progress system. Odd Answer still uses eight curated answer banks; AI does not create unlimited verified answers. Generated sessions are unranked. See [EDITORIAL.md](docs/EDITORIAL.md) for exact controls, clue repair, rights approval, review workflow and limitations.

`NVIDIA_REQUEST_TIMEOUT_MS` optionally sets a bounded authoring request timeout (1,000–180,000ms; default60,000ms), with an overall abort30,000ms later. The model/token budget is unchanged. The model's observed latency can be substantial; fallback is explicit and never labeled successful AI.

The [play-club UI research and verification](docs/UI-REDESIGN.md) documents the redesign and its limits. After building and installing Playwright Chromium, `npm run ui:capture -- DESTINATION` captures actual deterministic desktop/mobile play against isolated temporary databases.
