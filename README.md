# Fengi

Five instant-play browser games with shared daily editions, seeded practice, a seven-day archive and recoverable progress. Built with Next.js, React and strict TypeScript. Gameplay works without an external account or NVIDIA key. SQLite stores anonymous profiles and progress on the server; browser caching covers temporary interruptions.

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

Open `http://localhost:3000`. The blank `.env.local` key is intentional. All five games work without it. Use `npm run build` and `npm start` for the production server. The development server binds to all interfaces for remote workspaces; restrict network exposure as appropriate.

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
NVIDIA_MODEL=meta/llama-3.1-8b-instruct
FENGI_AI_ENABLED=true
```

Then run `npm run content:draft`. It writes a permission-restricted JSON draft under ignored `content-drafts/`. Without a key, with AI disabled, or on timeout/invalid output, it writes a deterministic draft with an explicit reason. No error bodies or credentials are logged. The model chooses among reviewed categories; accepted answers and scores come from the canonical catalogue, never generated claims. Review drafts before manually publishing content.

LangChain `ChatOpenAI` connects to NVIDIA’s documented Chat Completions endpoint. A 15-second request timeout, 20-second abort deadline, one retry and bounded output protect authoring. **NVIDIA trial terms do not grant production use of the service or generated content.** Verify the executed provider agreement and model license before publishing AI-assisted material. No real NVIDIA request has been tested without a supplied key.

## Structure

```text
src/app/                  App Router routes, metadata, global styles, health endpoint
src/components/           Product shell, shared results, save lifecycle, navigation
src/games/<game>/v1/       Retained v1 rules, content and views
src/games/releases/        Versioned save validators and frozen random generator
src/games/registry.ts      Game metadata and versioned session identities
src/lib/persistence.ts    Validated browser cache and legacy save import
src/server/               SQLite store, API security, save validation, private LangChain
scripts/                  Offline operator tools
tests/unit/              Engine, content and persistence tests
tests/e2e/               Real gameplay, reload, mobile and failure-flow tests
```

See [the implementation plan](docs/FENGI-PLAN.md) for product decisions, verified stable versions and scale-up boundaries; [operations](docs/OPERATIONS.md) for deployment preparation, content versioning, recovery and remaining production work.

## Scope and data

Progress is saved to `.data/fengi.sqlite` and cached locally. The production startup script keeps that path outside the generated build. Use a persistent local volume; an ephemeral/serverless filesystem will lose data. `FENGI_DATABASE_PATH` can select an absolute path; set `FENGI_ORIGIN` to the exact public HTTPS origin behind a reverse proxy. These have local defaults and need no external credentials.

Your progress includes one-time recovery codes, profile deletion and a JSON export. Recovery codes grant profile access: keep them private. Same-game browser tabs have one editor; server revisions reject stale device writes and provide an explicit conflict flow. Unsynced local records are retained for recovery. Old browser-only v1 saves load on their original engine and import when played.

```bash
npm run db:backup -- /absolute/backup/path/fengi.sqlite
npm run db:verify -- /absolute/backup/path/fengi.sqlite
```

See the operational restore procedure before restoring a database. This is a single-node SQLite deployment, not a horizontally distributed persistence service. Anonymous scores remain untrusted for rankings. New route loads need the server; there is no service worker. Odd Answer still has a finite eight-category v1 catalogue.

The original Alchemy Arena app remains untouched in `game/`, with historical designs in `design/` and `docs/`. It is not the new product entry point. The legacy GitHub Pages workflow is manual-only; the new server app is not a static Pages export. Nothing is deployed automatically by this change.
