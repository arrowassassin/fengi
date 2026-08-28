# Alchemy Arena — Design Spec v2

**Date:** 2026-08-27 · **Status:** Approved (v2 — supersedes v1)

> **Provenance note (2026-08-28):** the original v2 spec file was not present in the
> repository when implementation began (the repo contained only an initial commit).
> This document is a faithful reconstruction from the approved implementation brief
> and is the working source of truth. Items marked **[locked]** must not be changed
> without explicit product sign-off.
>
> **Design handoff update (2026-08-28, later):** the approved Claude Design export
> now lives in-repo at `design/claude-design-export/` (pulled from
> `feature/design-handoff`) and **is the source of truth for all visuals**,
> superseding the §7a/§7b defaults below (palette is ink/lime/tangerine/cyan,
> type is Archivo Black italic / Archivo / JetBrains Mono, artwork is the
> procedural holo-decal badge system). Contradictions between the handoff and
> the locked items below are logged in `game/src/design/COMPONENTS.md` — none
> were resolved silently.
>
> **Product decision (2026-08-28, design owner):** where the handoff and the
> locked items below conflict, **the design wins**: elements carry exactly
> **3 moves**, and types are **freeform AI-invented labels** backed by a
> deterministic label→archetype mapping onto the 12-way chart (mechanics stay
> reproducible). §3's "exactly 4 moves" and "types from the chart" are
> superseded accordingly; determinism guarantees are unchanged.

## 1. Concept **[locked]**

Alchemy Arena is a **zero-install browser game**. Players craft elements by fusing
two specimens on an alchemist's workbench; an **in-browser LLM (WebLLM)** invents
the result's **name, emoji, types, and moves**. Crafted elements form **3-specimen
squads** that fight **Pokémon-style turn-based battles** run by a **deterministic
engine** — the LLM is **commentator only** and can never affect battle outcomes.

## 2. Core loops

1. **Craft loop:** pick two specimens → fuse → LLM invents the result → sigil seal
   artwork is generated deterministically → new specimen enters the codex.
2. **Battle loop:** assemble a 3-squad → turn-based battle vs. AI (daily boss,
   ladder, or weekly-modifier arena) → verdict card → share grid.
3. **Retention loop:** daily boss, streaks with freezes, quests, achievements,
   weekly modifier, shareable results.

## 3. Crafting & the LLM **[locked: LLM never decides battles]**

- Fusion prompt returns strict JSON: `name`, `emoji`, `types` (1–2 of the type
  chart), `moves` (exactly 4: name, type, category physical/special/status, power,
  accuracy, PP, optional effect from a closed effect vocabulary), `flavor` (≤140 chars).
- Output is schema-validated; invalid output → bounded retries → deterministic
  fallback generator (seeded from the recipe hash) so crafting **never fails**.
- Base stats are **not** LLM-chosen: they derive deterministically from the recipe
  hash + parents (bounded budget), so balance is engine-controlled.
- Adapters: `WebLlmAdapter` (in-browser, default at launch), `HostedApiAdapter`
  (server-side ~1B-class model; used for the W1–2 quality gate and as fallback),
  `DeterministicAdapter` (offline/fallback/testing).

## 4. Battle engine **[locked: deterministic]**

- 3v3 squads, one active specimen per side, switch-on-faint, speed-ordered turns,
  type-chart effectiveness, STAB, physical/special split, accuracy checks, status
  effects from the closed vocabulary (burn, poison, stun, shield, drain, buff/debuff
  stages), PP.
- All randomness from a **seeded PRNG carried in the battle state**. Given the same
  two squads + seed + scripted move choices, the engine must produce an **identical
  battle log** (property-tested).
- The engine emits a structured event log; the commentator (LLM) turns log events
  into color text **after** they are decided. Commentary failures never block battle.
- Engine code is **pure TypeScript with no UI imports** (§7d) and no DOM/browser
  globals.

## 5. Retention layer **[locked: ships at launch]**

- **Daily boss:** one boss squad per UTC day, derived deterministically from the date.
- **Streaks + freezes:** consecutive-day play streak; earnable freezes auto-spend to
  protect a missed day (max bankable freezes: 2).
- **Quests:** 3 daily quests drawn deterministically from a quest table (seeded by date + player id).
- **Achievements:** milestone badges (crafts, discoveries, wins, streaks).
- **Weekly modifier:** one arena-wide battle rule per ISO week (e.g. "acid rain:
  water moves +20%"), deterministic from week number.
- **Share grid:** emoji grid summary of a battle (result, squad emoji, turn count),
  copy-to-clipboard, spoiler-safe.

## 6. Recipe registry & first-discovery **[locked: ships at launch]**

- Recipes are canonicalized (unordered parent pair + generation context) and hashed.
- An **edge recipe registry** records the first player to discover each recipe and
  credits them ("First discovered by …") to everyone who later crafts it.
- Client speaks to the registry through a small interface; a **local adapter**
  (IndexedDB/localStorage) provides offline + development behavior and is the
  fallback when the edge endpoint is unreachable.

## 7. Presentation

- **a. Fonts:** Fraunces (display), Spline Sans (UI), Spline Sans Mono (numeric/log).
- **b. Palette:** brass `#D9A441` on obsidian `#101418` family (spec default —
  approved designs are source of truth where they deviate).
- **c. All screens style exclusively via `game/src/design/tokens.css` custom
  properties — no ad-hoc colors or fonts.**
- **d. Engine purity [locked]:** `engine/` must not import from UI, DOM, or design
  modules; enforced by an automated boundary check in CI.
- **e. Artwork — sigil seals [locked]:** every specimen's art is a **seeded Canvas
  sigil** (rings, spokes, glyph marks) with the specimen's **monochrome Noto Emoji**
  glyph at center. Same specimen → same art on every device. The prototype
  (`docs/prototypes/sigil-seals-demo.html`) used a 32-bit hash; production uses a
  **64-bit hash** (FNV-1a 64 → splitmix64 → sfc32 stream) to kill collisions.

## 8. Non-goals (launch)

Accounts/social graphs, real-time PvP, monetization, mobile-native wrappers,
server-authoritative battles.

## 9. Quality bars

- Determinism property tests green before any rendering work.
- Craft JSON validity ≥ 95% on the gated model before shipping WebLLM path.
- Type-safe throughout (strict TS), lint/format clean, CI green.

## 10. Milestones (16 weeks) **[locked]**

| Weeks | Milestone |
|---|---|
| **W1–2** | **Go/no-go:** craft + moveset quality on a ~1B model via **hosted API first**; eval harness + rubric; determinism test scaffold. |
| W3–4 | Battle engine core (turns, damage, type chart, status, PP) fully property-tested. |
| W5–6 | Craft pipeline end-to-end (adapters, schema, fallback, stats derivation) + sigil art system (64-bit). |
| W7–8 | Battle UI + commentator; workbench/craft UI; codex. |
| W9–10 | Retention layer (daily boss, streaks/freezes, quests, achievements, weekly modifier). |
| W11–12 | Recipe registry + first-discovery credits; share grid. |
| W13–14 | WebLLM in-browser path, performance, model download UX. |
| W15–16 | Polish, accessibility, balancing pass, launch hardening. |
