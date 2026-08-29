# Alchemy Arena — component inventory (Step 1)

**Source:** approved Claude Design handoff at `design/claude-design-export/`
(pulled from `feature/design-handoff`): 6 mobile artboards (390px), 2 desktop
variants, working fusion prototype, and `README.md` with the full token +
motion spec. High-fidelity — colors, type, spacing, copy, motion are final.

All components style exclusively via `tokens.css` custom properties (spec §7c).

## ⚠️ Design ↔ spec contradiction log (nothing resolved silently)

| # | Handoff says | Spec v2 says | Status |
|---|---|---|---|
| 1 | Badge seed = 32-bit FNV-style hash of the element **name** | §7e **[locked]**: artwork seeded by the **64-bit recipe hash** | Resolved: design's badge *visuals* ported verbatim, seeded from the 64-bit recipe hash (same determinism guarantee, stronger hash — the §7 upgrade applied to the badge system) |
| 2 | 3 moves per element (plaque, arena, prototype recipe table) | §3 said exactly 4 moves | **RESOLVED 2026-08-28 by the design owner: design wins.** Engine, schema, adapters, and UI all use exactly 3 moves |
| 3 | Freeform invented types (`PAPER`, `IDEA`, `GOSSIP`, `LAW`) | §3/§4 said 1–2 types from the fixed 12-type chart | **RESOLVED 2026-08-28 by the design owner: design wins.** Types are freeform invented labels; each label maps deterministically onto one of the 12 mechanical archetypes (keyword families + hash fold) so the battle chart stays total and reproducible |
| 4 | ink/lime/tangerine/cyan palette, Archivo Black/Archivo/JetBrains Mono, zero border radius | spec default was brass/obsidian + Fraunces/Spline Sans | Designs win (brief pre-authorized: designs are source of truth on visuals) |
| 5 | HP = integer 0–12 ring segments | engine HP is continuous | UI maps `currentHp/maxHp` → 12 segments; engine untouched (§7d) |

## Components

| Component | What it is (handoff ref) | States | Appears on |
|---|---|---|---|
| **Holo-decal badge** (was "specimen seal") | Procedural SVG burst polygon (n = 6 + tier×3 spikes, jittered), hard black offset shadow, halftone dot core, centered monochrome Noto Emoji glyph in the element's single ink color. Deterministic from the 64-bit recipe hash | default · **foil** (holo-gradient fill, off-white stroke, 5s hue-rotate shimmer) · tier 0–4 (spike count) · undiscovered (dashed circle + mono `?`) | Workbench stage/tray, arena fighters, codex sticker-book, result card, lineage nodes, boss (tier 4 + glitch flicker) |
| **Segmented HP ring** (no health bars) | 12 SVG arc segments, r≈87/200, 9° gaps, from 12 o'clock. Filled 11px lime (player) / cyan (foe); empty 5px off-white 13% | full · damaged (last 1–2 filled segments tangerine, dashed `7 5`, 3 shard lines) · **shattered at 0** (debris lines) | Arena fighters, bench minis, result-card squad |
| **Move card** | Display-italic name, lime mono power top-right, type sticker chip, 8.5px effect line at 55% off-white | default · selected (lime 2px border + lime `READY` tab) · disabled (0 PP) | Arena control panel, spec plaque |
| **Spec plaque** | Panel, off-white 2px border, 6px hard shadow, `SPEC PLAQUE` tape overlapping the top edge, name display-italic 19px, type chips, tier/foil line in cyan mono, moves with lime powers | fresh reveal · codex detail | Workbench, codex |
| **Tape strip** | Off-white bg, ink text, mono 7–9px tracked 1.5–2px, padding 3px 8px, rotated ±1–2° | label · counter · `TODAY` (lime) | Everywhere (labels, counters, attributions) |
| **Sticker chip** (type badge) | 2px solid border in type color, mono 8px 800, rotated ±1° | per-type color · active filter (lime fill) | Plaque, arena, codex filters |
| **Verdict lockup** | Display italic, uppercase, ink outline + hard black shadow, rotated −8…+6° (`NEW DISCOVERY!` lime · `SUPER EFFECTIVE!` tangerine · `VICTORY` 52px lime · `KRA-KOW!!` tangerine) | per-moment color | Workbench reveal, arena, result card |
| **Result card** | 8px hazard-stripe border frame, halftone, match tape, verdict, finisher lockup + tape, squad with final ring states, judge quip (italic + cyan mono attribution), wordmark footer; exports 1080×1350 | victory · defeat | Post-battle |
| **Spoiler-free share** | Mono Wordle-style clipboard text (platform emoji correct here): title, 🟩🟧 turn row, squad row, 🔥/🧊 streak row, url | copy → `COPIED` tape flash | Result card |
| **Streak sticker chips** | 36×44 chips rotated ±2°, 3px hard shadows: won = lime border + ✔ · frozen = cyan border, cyan 12% fill, ❄ · today = dashed + ▶ | won/frozen/today/missed | Daily boss screen |
| **Quest ribbon** | Collapsed panel bar, 7px hazard-stripe left spine, lime `TODAY` tape, boss name in display italic, chevron | collapsed · complete | Workbench top, daily |
| **Codex sticker-book cell** | 58px badge + 7px mono name; foil cells carry rotated holo `FOIL` tab + shimmer | discovered · foil · undiscovered (`???` dashed) | Codex grid |
| **Rank meter** | 12 skewed (−14°) segment cells, lime fill for progress | per-rank | Codex header |
| **Advancements strip** | 32px Noto-Emoji nodes joined by 12px connectors; unlocked = lime border/glyph + lime 8% fill; locked = dashed off-white 25% | locked/unlocked | Codex bottom |
| **Lineage overlay** | Full-screen `#0A0A0C`, root-down tree with 4px off-white comic-gutter elbows (opacity 85→55%/gen), primitives labeled cyan `◦` | open/close | Codex |
| **Boss poster** | Tier-4 badge 230px, glitch flicker (RGB-split ghost copies, steps() loop), chromatic-split title, tangerine hijack banner, countdown in lime mono | fresh · beaten | Daily boss |
| **Broadcast bar** | Tangerine live-dot, `LIVE · CH.9` mono left, turn + watching right | live | Arena |
| **Commentary line** | Streaming italic cyan 13px + dim caret `▌` | streaming/idle | Arena |
| **Neon download sign** | Wordmark letters light lime as model shards cache; boundary letter buzz-flickers; 6 skewed section cells | progress states | First-run |
| **Fusion stage** | Bordered panel with speed-lines + halftone; parent badges + `=`; result slams in (450ms overshoot, 14 particles, shake) or `FIZZLE.` + shake | idle → A → B → brewing (900ms pulse) → result/fizzle | Workbench |
