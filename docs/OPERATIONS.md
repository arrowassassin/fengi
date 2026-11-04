# Operations and maintenance

## Current operating model

One Next.js Node 26 LTS server serves routes and static assets. Game engines run on the client; the public app has no model endpoint, authentication service, database or paid API calls. Private content generation runs as a separate operator CLI. `GET /api/health` returns a small non-secret application/version health response, with caching disabled.

This is a working application foundation, not a claim of enterprise certification or launch readiness. The current product contract is guest play and local progress. Cloud sync, account recovery, global competition, hosted monitoring and service-level guarantees are not implemented features.

## Deploy only after authorization

Run `npm ci`, all checks, and `npm run build` using the pinned runtime. Deploy the standalone Node output to a supported host or run `npm start`. A standalone bundle needs `.next/static` copied to its `.next/static` directory (and `public/` if later added). Terminate HTTPS at the host/proxy, set a process restart policy and health check, and collect redacted process errors and request status/latency. Do not expose a development server publicly. Do not place NVIDIA credentials in `NEXT_PUBLIC_*` variables, client bundles, URLs or logs.

The repository's legacy Pages workflow is manual-only and still concerns the preserved Alchemy Arena app. It is not a deployment path for this app. No production environment was provisioned or deployment performed during this implementation.

## Versioning and data continuity

Session IDs include game ID, rule version, mode, seed and pace. Daily date selection is UTC; a mounted session keeps its original edition across midnight. Change a generator, scoring rule or curated answer set only with an explicit version migration. Freeze earlier versions when preserving historic editions; otherwise communicate a reset instead of silently changing an old score.

Local save envelopes use schema version 1; every game validates its own snapshot invariants. Corrupt/incompatible state starts a new round with an explanation where possible. Browser-storage denial or quota failure is visible and does not stop play. The most recent 60 records are retained. Multiple tabs can overwrite a simultaneous edit to the same session; cloud reconciliation and cross-tab locks are future work. Do not use these records for trusted rankings.

Back up source and lockfiles in Git. Local browser progress is not centrally backed up. If cross-device persistence becomes a product requirement, introduce a data adapter backed by PostgreSQL, authenticated identities, deletion/export flows, migration tests and backup/restore drills. Do not promise migration of arbitrary edited client scores into a trusted leaderboard.

## Content operations

Odd Answer's current eight categories are in `src/games/odd/content.ts`. Add prompts with bounded scope, reviewed accepted answers/aliases, transparent scoring tiers and source/rights review. Run duplicate/normalization tests before publishing. Avoid claiming measured rarity. Unknown entries are described as missing from the edition, not automatically false.

The LangChain authoring CLI writes drafts only. Its returned `source`, `reason` and `status` distinguish model output, missing configuration and fallback. The schema rejects unknown IDs, duplicate categories, extra fields, malformed JSON and oversized strings. Authoritative answers/scores are copied from reviewed data. Do not publish model prose without human review. Introduce a durable queue, shared budget/rate limits, authorization and audit logs before offering server-triggered authoring to multiple users.

NVIDIA request timeout: 15 seconds; overall abort signal: 20 seconds; SDK retries: at most one. Error bodies are discarded to avoid leaking secrets. Licensing and model/provider suitability are separate release gates. A real key and authorized provider access are still needed for a live smoke test.

## Quality and observability

CI checks formatting/lint, strict types, deterministic engine invariants, save validation and provider failures, production compilation, dependency advisories, and desktop/mobile Chromium gameplay. Browser test failure traces are retained as CI artifacts. Review traces before sharing: future authenticated tests could contain user data. A health endpoint proves process availability, not player experience or dependency health.

Before a public launch: run real iOS Safari/Android tests, screen-reader review, contrast and reduced-motion checks, performance profiling on low-end phones, security-header/CSP review for the chosen host, privacy policy review for host logs, and playtesting for difficulty/fairness. Add consent-aware monitoring with redaction before collecting analytics. Measure route error rates, load times, storage-save failures and content-generation failure reasons without capturing keys, free-form answers or personal identifiers unnecessarily.

## Rollback and release safety

Use immutable build artifacts tagged with the Git commit. Keep the previous artifact and environment configuration available; roll back the application together with compatible content/rule versions. Smoke-test the five daily games, practice, archive, saved-state restoration and health endpoint after each release. Never roll back by deleting player data. Draft PRs are review boundaries; merging and deployment require separate authorization.

## Dependency maintenance

The selected stable versions and source verification are recorded in `FENGI-PLAN.md`. Use the official registry and upstream release/security notes when updating. Keep exact top-level pins and `package-lock.json`; avoid indiscriminate major upgrades. Audit the root app separately from the preserved legacy `game/` project. CI uses the runtime from `.nvmrc`; upgrading it is a reviewed change, not a floating production setting.
