# Fengi product and implementation plan

## Product contract

Fengi is a guest-first destination for short, satisfying browser games. One daily edition per game is shared globally at 00:00 UTC; practice has independent seeds and records. A round has a clear end, an honest result and an optional next round. No autoplay, punitive streaks, fabricated player percentiles or paid competitive advantages. Working names need originality/trademark review before launch.

The existing Alchemy Arena source in `game/`, its design assets and infrastructure remain intact as legacy reference. New work lives at the repository root in `src/`; the clean starting checkout had no uncommitted user changes. No legacy code is deleted. The new app does not use the older design as its source of truth.

## Five playable games

| Game | Rules and player decisions | Validation and replay | Completion |
| --- | --- | --- | --- |
| Signal Grid | Mark each 5×5 cell circle or cross; satisfy row and column circle counts while respecting fixed clues. Undo and explicit tile reveals. | Seeded generation removes clues only while a backtracking solver confirms exactly one solution. | Correct full board; record moves and reveals, never a speed penalty. |
| Orbit Tap | Reverse direction around a ring; collect sparks, avoid visibly pulsing gates. Three lives, 45 active seconds. Pause at any time. | Fixed simulation step, seeded spark positions, equivalent daily course. Slower practice has separate records. | Time expires or lives run out; score is 10 per spark. |
| Odd Answer | Three bounded category prompts, one accepted answer each. Unknown inputs can be retried or skipped without pretending to be factually wrong. | Small original editorial catalogue; documented aliases and fixed 10–40 point tiers, never claimed as measured rarity. Practice reshuffles a finite catalogue. | Three submitted/skipped rounds; show answers and scoring explanation. |
| Trail Trace | Move orthogonally through a 6×6 garden, gather three seeds and reach the exit. Retracing is allowed; seek a short route. | Seeded obstacles and BFS over cell × collected-seed-mask prove reachability and compute the optimal move count. | Exit reached with all seeds; show moves versus the solver’s optimum. |
| Pair Bloom | Reveal two cards at a time on a 4×4 board; match all eight pairs. Mismatches remain visible briefly, then turn back. | Seeded deck with exactly two of every symbol. No timer, no penalty for leaving. | Eight matched pairs; show turns (the theoretical minimum is eight). |

## UX and visual system

- Home: editorial headline; one prominent Signal Grid card; four distinct secondary games, each with category, duration, visual motif and a direct play action. No catalogue clutter or account wall.
- Play: breadcrumb, game name, explicit daily/practice identity and concise instructions; large touch targets, keyboard controls, visible focus, text/shape redundant with color. Board is prioritized on phones. Local rules use native disclosure where necessary.
- Results: actual performance, an explanation of scoring, optional text sharing, “Done for now” and a deliberate practice invitation. Returning to the daily edition restores the result.
- Practice: all five games and a new locally generated seed; Orbit’s calm mode is labeled and isolated. Unlimited seeds do not imply an infinite curated word catalogue.
- Archive: last seven UTC editions with direct links. Active session identity remains fixed across midnight; the home page shows the next edition on a fresh visit.
- Progress: per-device completion history, no implied global leaderboard or cloud sync. Storage failure is visible; malformed or outdated data is ignored safely. Keep bounded recent sessions.
- Visual language: warm paper, ink typography, saturated cobalt for logic, coral for arcade, lilac for words, moss for routes and rose for memory. Serif display type, readable system UI text, consistent spacing/radii, game-specific geometric art. No external font dependency.
- Motion: short tile/feedback transitions and actual arcade motion; honor reduced motion for decorative effects. Pause arcade when the tab hides or the component leaves. Avoid fixed viewport shells and horizontal overflow at 320px.

## Architecture and stability

Use Next.js App Router as a single modular deployable, React and strict TypeScript. Pure engines and versioned content are separate from client game views. A typed registry drives navigation and session identity. CSS tokens provide a coherent design without a large UI framework. Route-level code splitting keeps LangChain off gameplay clients.

Pin current stable releases verified 4 November 2026: Next 16.4.5, React/React DOM 19.3.1, TypeScript 7.0.2, LangChain OpenAI 1.8.0/Core 1.3.4, Zod 4.6.7, Vitest 5.1.0, Playwright 1.64.1, axe Playwright 4.14.0, Biome 2.6.4. Node 26.13.0 is the current Node 26 LTS release; fetched binary checked against official SHA256. Avoid canary/alpha dependencies. Commit the npm lockfile; update versions deliberately with tests.

Sources checked: [Next installation](https://nextjs.org/docs/app/getting-started/installation), [Node release policy](https://nodejs.org/en/about/previous-releases), official npm registry `/latest` metadata and peer/engine declarations, [LangChain ChatOpenAI compatibility](https://docs.langchain.com/oss/javascript/integrations/chat/openai), [NVIDIA Chat Completions endpoint](https://docs.api.nvidia.com/nim/reference/llm-apis). Next and LangChain accept Node 26; React DOM and React versions match.

### Persistence and trust

Browser-local versioned snapshots provide guest resume without a database or account service. Validate snapshots against schemas and game invariants, cap history, catch quota/security failures, and preserve session keys across reloads. Local results are not trusted competitive scores. Do not promise offline navigation until a service-worker/cache strategy is implemented. Existing loaded deterministic games do not need an AI service.

Scale later through an explicit data adapter: PostgreSQL for accounts, published editions and cross-device progress; object storage/CDN for immutable content; background jobs and a durable queue for content generation; shared rate limits if a public AI endpoint is ever added. Do not introduce these operational dependencies before they are needed. A standalone Node server is the supported build output, not a static GitHub Pages export.

### AI content authoring

`NVIDIA_API_KEY` is server-only and blank in `.env.example`; opt-in `FENGI_AI_ENABLED=false` by default. Use LangChain ChatOpenAI against NVIDIA’s documented compatible endpoint with a bounded timeout, bounded output and at most one retry. A private CLI produces draft content, never a public unmetered endpoint. Model choices are configurable through `NVIDIA_MODEL`.

AI output is untrusted: parse JSON with Zod, reject unknown/duplicate category IDs and empty or oversized strings, and derive accepted answers and scores from the reviewed canonical catalogue. Failure or no key returns a deterministic draft with an explicit source/status. Human review is required before publishing a new pack; no model judges live play. Trial access does not establish production rights for either service use or generated content. Production licensing, model terms and provider costs remain a release gate.

## Vertical slices and verification

1. Foundation: stable dependencies, routes, registry, tokens, schema-validated persistence, complete Signal Grid daily/practice/result flow.
2. Arcade + words: fixed-step simulation, pause/resume and calm mode; bounded category validation, skips, results and clear scoring.
3. Routes + memory: BFS-backed solvability/optimality and turn-based matching with interruption recovery.
4. Product shell: home, archive, practice, per-device progress, error/not-found handling, sharing and mobile layouts.
5. Private content workflow: LangChain adapter, schema validation, fallback and redacted failure behavior.
6. Quality: unit tests for determinism, invariants, generation, judging, persistence and AI failure; browser tests on desktop/mobile for navigation, real completion, reload, tab interruption, keyboard controls and corrupt/blocked storage; lint, typecheck and production build.
7. Review handoff: inspect the final diff, commit only intentional source changes, push the feature branch, open a draft PR, verify remote HEAD and report CI outcomes. Never merge or deploy. Convert the old automatic Pages workflow to manual-only so a future root merge cannot silently publish the unrelated legacy app.

## Release boundaries

This foundation is not a claim of launch readiness. Remaining release work includes real-device playtesting and difficulty calibration, editorial expansion and rights review, privacy/consent decisions for any future analytics, security/rate-limit design for accounts or public APIs, licensed model-provider validation with a real key, and an explicitly authorized deployment destination. No real key is available for a live NVIDIA integration test.
