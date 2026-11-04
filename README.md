# Fengi

Five instant-play browser games with shared daily editions, seeded practice, a seven-day archive and per-device progress. Built with Next.js, React and strict TypeScript. Gameplay works without an account, database or NVIDIA key.

- **Signal Grid:** solver-verified, uniquely solvable circle/cross grids.
- **Orbit Tap:** fixed-step arcade with reversal, pulsing gates, three lives, pause/resume and calm practice.
- **Odd Answer:** three curated prompts with explicit aliases and transparent editorial scoring.
- **Trail Trace:** seeded gardens with three collectibles and a solver-proven shortest route.
- **Pair Bloom:** seeded memory decks with eight matching pairs and saved progress.

## Run locally

Use Node **26.13.0 LTS** (`.nvmrc`). Versions are pinned; install from the lockfile.

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
src/games/<game>/engine.ts Pure deterministic rules and generators
src/games/<game>/view.tsx  Accessible interactive React game
src/games/registry.ts      Game metadata and versioned session identities
src/lib/persistence.ts    Bounded, validated local storage records
src/server/               Private LangChain adapter and content validation
scripts/                  Offline operator tools
 tests/unit/              Engine, content and persistence tests
 tests/e2e/               Real gameplay, reload, mobile and failure-flow tests
```

See [the implementation plan](docs/FENGI-PLAN.md) for product decisions, verified stable versions and scale-up boundaries; [operations](docs/OPERATIONS.md) for deployment preparation, content versioning, recovery and remaining production work.

## Scope and data

Progress stays in this browser (up to 60 recent sessions). Reload restores game state; no cloud sync, accounts or global rankings are claimed. Local scores are not tamper-resistant. The app has no analytics scripts. Newly opened routes still need the server; a service worker/offline cache is not implemented. Odd Answer reshuffles a finite eight-category catalogue; its content is not infinite.

The original Alchemy Arena app remains untouched in `game/`, with historical designs in `design/` and `docs/`. It is not the new product entry point. The legacy GitHub Pages workflow is manual-only; the new server app is not a static Pages export. Nothing is deployed automatically by this change.
