# Alchemy Arena — Implementation Plan

**Date:** 2026-08-28 · **Spec:** `docs/superpowers/specs/2026-08-27-alchemy-arena-design.md` (v2)
**Method:** test-driven (red → green → refactor per unit); engine work precedes all rendering.

> Written in the superpowers `writing-plans` format (the skill itself is not
> installed in this environment): phases map to the spec §10 milestones, each
> phase lists exact files and a verification gate.

## Ground rules (from spec, all phases)

- `game/src/engine/**` never imports UI/DOM/design modules (§7d) — enforced by
  `engine-purity` test + CI.
- Determinism property tests (same squads + seed + script → identical log) must be
  green **before any rendering work** (§9).
- All screens style via `game/src/design/tokens.css` only (§7c).
- Strict TypeScript, latest stable deps, Biome for lint + format, Vitest + fast-check.

## Phase 0 — Scaffold (part of W1–2)

**Files:** `game/package.json`, `game/tsconfig.json`, `game/vite.config.ts`,
`game/biome.json`, `game/index.html`, `game/src/main.ts`.
**Verify:** `npm run check` (biome + tsc) and `npm test` pass on empty suite; `npm run build` emits `dist/`.

## Phase 1 — W1–2 go/no-go: craft quality on ~1B model, hosted API first **[locked]**

Goal: decide go/no-go for LLM-invented crafting before deep engine investment.

1. **Craft schema first** — `game/src/craft/schema.ts`: strict runtime validator for
   the fusion JSON (name, emoji, 1–2 types from the type chart, exactly 4 moves with
   closed effect vocabulary, flavor ≤140). Tests: valid/invalid corpus.
2. **Adapters** — `game/src/craft/adapters/`: `HostedApiAdapter` (OpenAI-compatible
   `/chat/completions` endpoint, model configurable, targets a ~1B-class model, e.g.
   Qwen3-0.6B/Llama-3.2-1B class), `DeterministicAdapter` (seeded, always valid),
   `WebLlmAdapter` (stub now, filled in Phase 6 — same interface).
3. **Eval harness** — `game/eval/craft-eval.ts` + fixed recipe corpus
   (`game/eval/recipes.json`, 60 pairs). Metrics: JSON validity %, schema validity %,
   name novelty (no verbatim parent copy), type plausibility, move duplication rate.
   Rubric + thresholds in `game/eval/RUBRIC.md`: **go = ≥95% schema-valid after ≤2
   retries and ≥80% rubric pass**; else fall back to DeterministicAdapter at launch
   and re-gate WebLLM in W13.
4. **Determinism test scaffold** — property-test harness + PRNG utilities land now
   (`game/src/engine/rng.ts`, first property test file), so W3–4 starts red-green.

**Verify:** harness runs offline against `DeterministicAdapter` in CI (hosted run is
manual, needs `CRAFT_API_URL`/`CRAFT_API_KEY`); schema tests green.

## Phase 2 — W3–4 battle engine core (all TDD, no rendering)

Order of red→green units in `game/src/engine/`:
`rng.ts` (splitmix64/sfc32, serializable state) → `types.ts` (type chart, chart
tests) → `stats.ts` (recipe-hash-derived stats, bounded budget) → `damage.ts`
(formula, STAB, effectiveness, crit, variance from seeded PRNG) → `status.ts`
(closed vocabulary effects) → `battle.ts` (3v3 loop: speed order, accuracy, PP,
switch-on-faint, win/draw detection, structured event log) → `ai.ts` (deterministic
opponent policy) → `log.ts` (event log types + stable serialization).

**Property tests (fast-check):**
- determinism: ∀ squads, seed, move script → two runs give byte-identical logs;
- serialization round-trip of battle state resumes to the identical remaining log;
- termination: every battle ends ≤ bounded turns;
- damage bounds: 0 ≤ damage ≤ defender max HP; PP never negative.

**Verify:** engine coverage green; `engine-purity.test.ts` proves no UI/DOM imports.

## Phase 3 — W5–6 craft pipeline end-to-end + sigil art (64-bit)

- `game/src/craft/pipeline.ts`: adapter → validate → bounded retries → deterministic
  fallback; stats from `stats.ts`; recipe canonicalization + 64-bit hash in
  `game/src/registry/recipe.ts` (shared with art + registry).
- `game/src/art/sigil.ts`: port of `docs/prototypes/sigil-seals-demo.html` renderer,
  upgraded to 64-bit (FNV-1a 64 → splitmix64 → sfc32). Deterministic draw-command
  list is computed pure (testable); canvas painting is a thin shell.
**Verify:** pipeline never throws (property test over adapter failure injection);
sigil draw-commands stable across runs; hash tests vs. known vectors.

## Phase 4 — W7–8 battle UI + commentator, workbench, codex

- `game/src/ui/` screens: workbench (bench slots, reveal, first-discovery toast),
  battle (seals, ink-ring HP, move cards, log pane), codex (grid cells, lineage).
- `game/src/commentary/`: LLM commentator consuming the event log post-hoc; failure
  → silent skip (never blocks battle).
**Verify:** vitest component/DOM tests for screen wiring; visual pass vs. designs
(**blocked on design access — flag, don't guess, where tokens are ambiguous**).

## Phase 5 — W9–10 retention layer

`game/src/retention/`: `dailyBoss.ts` (UTC-date-seeded boss squad), `streak.ts`
(streak + max-2 freezes, auto-spend), `quests.ts` (3/day, date+player seeded),
`achievements.ts`, `weeklyModifier.ts` (ISO-week seeded rule applied as engine
config, not engine patch), `shareGrid.ts` (emoji grid). Persistence via
`game/src/persist/` (localStorage, versioned, migratable).
**Verify:** unit tests incl. streak edge days (TZ, freeze exhaustion), modifier
application property test (engine still deterministic under modifiers).

## Phase 6 — W11–12 recipe registry + first-discovery; W13–14 WebLLM; W15–16 polish

- `game/src/registry/`: `RegistryClient` interface; `LocalRegistry` (offline/dev);
  `EdgeRegistry` (fetch-based, optimistic-claim protocol: claim(hash, player) →
  first-writer-wins, returns credited discoverer); UI credit lines.
- `WebLlmAdapter` real implementation (`@mlc-ai/web-llm`), model download UX,
  re-run Phase 1 gate on-device.
- Polish: a11y pass, balancing from engine simulations, perf budget.

## CI (lands with Phase 0, grows with the code)

`.github/workflows/ci.yml` — biome check, tsc, vitest (incl. determinism + purity)
on push/PR. `.github/workflows/pages.yml` — build `game/` and deploy to GitHub
Pages on main. Validation subagents review each merged segment.
