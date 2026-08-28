# Handoff: Alchemy Arena — Full Game UX

## Overview
Complete UX design for **Alchemy Arena**, a browser game where players craft elements by combining two existing ones (an AI invents the result, its types, and its battle moves), then fight Pokémon-style turn-based battles with squads of 3. The AI runs locally in the browser (~600MB download on first visit); no accounts, no install.

Deliverables: 6 mobile artboards (390px) + 2 desktop variants + 1 working fusion-interaction prototype.

## About the Design Files
The files in this bundle are **design references created in HTML** — prototypes showing intended look and behavior, **not production code to copy directly**. Recreate these designs in the target codebase's environment (React, Svelte, etc.) using its established patterns. If no environment exists yet, pick the most appropriate stack for a client-only browser game (e.g. React + Canvas/DOM hybrid, or plain TS + Web Components) and implement there.

The two `.dc.html` files use a custom design-tool runtime (`support.js`, `<x-dc>`, `{{ }}` holes). Ignore that scaffolding entirely — read the inline styles, the SVG-generation logic in the `class Component` script, and this README.

## Fidelity
**High-fidelity.** Colors, typography, spacing, copy, and motion specs are final intent. Recreate pixel-perfectly. The procedural badge system (below) is algorithmic and must be reimplemented as code, not exported as images.

---

## Design Tokens

### Colors
| Token | Hex | Role — STRICT |
|---|---|---|
| ink | `#0D0D0F` | ground / page background |
| panel | `#17171C` | all panels, cards, chips (with hard 2px outlines) |
| outline | `#26262E` / `#2C2C34` | default panel borders |
| acid lime | `#D8FF3E` | selection, energy, CTAs, player HP — **discipline: never decorative** |
| hot tangerine | `#FF5C2A` | damage, crits, hype moments ONLY |
| glitch cyan | `#35E0FF` | info/status, commentary, primitives |
| off-white | `#F5F2EA` | text, tape strips, emphasis borders |
| foil magenta | `#FF3EF0` | only inside the holo gradient |
| holo gradient | `linear-gradient(135deg, #35E0FF → #FF3EF0 → #D8FF3E)` | foil/rare variants |

Dim text: off-white at alpha .3–.6. Never pure white or gray hues.

### Typography (Google Fonts)
| Role | Font | Treatment |
|---|---|---|
| Display | **Archivo Black** | ALWAYS `font-style: italic` (synthesized slant), uppercase. Element names, verdicts, comic bursts, CTAs |
| UI grotesque | **Archivo** 500–800 | body copy, descriptions |
| Mono | **JetBrains Mono** 500–800 | counters, timers, tape strips; uppercase + `letter-spacing: 1–3px` |
| Glyphs | **Noto Emoji** (monochrome emoji font) | element glyphs, colorable via `fill`/`color` |

Minimums: 44px hit targets on mobile; smallest mono label 6.5–8px is used on dense tape strips (390px artboards) — bump proportionally if accessibility requires.

### Spacing / shape language
- No border radius anywhere. Everything is hard-edged, die-cut.
- Hard drop shadows: `box-shadow: 4–6px 4–6px 0 #000` on cards/plaques/buttons.
- Tape strips: off-white bg, ink text, mono 7–9px, `letter-spacing 1.5–2px`, padding `3px 8px`, rotated ±1–2°.
- Hazard stripes: `repeating-linear-gradient(-45deg, #D8FF3E 0 7–9px, #0D0D0F 7–9px 14–18px)` — panel edges, ribbon spines, card borders.
- Halftone dot fields: `radial-gradient(rgba(245,242,234,.05) 1.1px, transparent 1.6px)`, `background-size: 11-12px`.
- Speed lines: `repeating-conic-gradient(from 0deg at X Y, rgba(color,.07–.14) 0deg 1.6–2deg, transparent 2deg 13–16deg)` centered on the focal badge.
- Sticker chips (type badges): 2px solid border in type color, mono 8px 800, rotated ±1°.

---

## CRITICAL SYSTEM — Procedural Holo-Decal Badges

Every element's artwork is generated, never drawn or emoji-pasted. **Same element = identical badge everywhere** (deterministic from name). Never render colorful platform emoji.

Algorithm (reference implementation in both `.dc.html` logic scripts — port verbatim):
1. `seed = hash(elementName)` (FNV-style: `h = imul(h ^ charCode, 387420489)`).
2. Seeded LCG PRNG: `s = (s * 1664525 + 1013904223) >>> 0`.
3. Burst polygon: `n = 6 + tier * 3` spikes; 2n vertices alternating outer radius ~55 and inner ~37 (viewBox 120), each jittered ±10–15%, random start rotation. Higher tier ⇒ more spikes ⇒ more elaborate.
4. Layers (back to front):
   - shadow: same polygon, `translate(5,6)`, black 90%
   - tier ≥ 2: second smaller burst, stroke-only, element color at 45%, rotated 9°
   - main burst: fill `#17171C`, stroke element color 3px (**foil**: fill = holo gradient, stroke off-white)
   - halftone: circle r31 filled with a 7×7 dot pattern in element color at 38% (foil: ink at 25%)
   - glyph: monochrome **Noto Emoji** character, centered, ~40/120 units, filled in the element's single ink color (foil: ink `#0D0D0F`)
5. Foil variants: holo-gradient fill + continuous `hue-rotate(360deg)` shimmer loop (5s linear).
6. Undiscovered: dashed off-white circle at 20% + mono `?`.

Element ink colors come from the palette only (off-white default; cyan = water/info-ish; tangerine = fire/hostile; lime = rare/energy — keep lime scarce).

## CRITICAL SYSTEM — Segmented HP Ring (no health bars)
- 12 arc segments around the badge, radius ~87/200 viewBox, gap 9°, starting at 12 o'clock.
- Filled segments: 11px stroke, lime (player) / cyan (opponent). Empty: 5px stroke, off-white 13%.
- Damage edge: last 1–2 filled segments turn **tangerine**, dashed (`7 5`), with 3 short shard lines flying outward.
- At zero HP the ring **shatters**: segments replaced by scattered debris lines (off-white 30%, random jitter/rotation) — see result-card squad, third fighter.

---

## Screens / Views

All frames live in `Alchemy Arena Artboards.dc.html` (canvas ids `1a`–`1i`). Mobile 390×844; desktop 1160×720.

### 1a — WORKBENCH (mobile) & 1h — desktop
The underground lab; state shown = moment after a fusion.
- **Daily quest ribbon** (collapsed, top): panel bg, 7px hazard-stripe left spine, lime `TODAY` tape, copy: *"craft something that beats THE LANDLORD"* (boss name in display italic), chevron.
- **Fusion stage** (bordered panel, speed-lines + halftone): parent badges `STORM + LIBRARY =`, then the new 170px badge (**BANNED WEATHER BOOKS**, tier-3 FOIL) rotated −5° with lime/off-white particle burst and `NEW DISCOVERY!` lockup (lime display italic, 4-direction ink outline + hard black shadow, rotated −8°). Meta line mono: `FUSION 00:00:02 · FIRST IN THE WORLD ▲`.
- **Spec plaque**: panel, off-white 2px border, 6px hard shadow, `SPEC PLAQUE` tape overlapping top edge; name in display italic 19px; type sticker chips `PAPER` (off-white) `IDEA` (lime); `TIER 3 · FOIL` in cyan mono; 3 moves as name + lime mono power (65/50/80).
- **Element tray**: search field (panel, mono placeholder `SEARCH THE SHELF…`), `247 DISCOVERED` tape counter, wrapping grid of 52px badges, bottom fade implies scroll.
- Desktop (1h): 330px shelf column left (search + counter + grid) · center stage · 330px right column (plaque, `RECENT FUSIONS` mono log, lime `SEND TO SQUAD →` CTA). Wordmark `ALCHEMY ARENA` in top ribbon.

### 1b — ARENA (mobile) & 1i — desktop  ★ identity screen
Televised street fight, mid-fight state.
- **Broadcast bar**: tangerine live-dot, `LIVE · CH.9 STREET FIGHT` mono, right `TURN 07 · 12,431 WATCHING`.
- **Commentary line** (streaming, italic, cyan, 13px): *"The umbrella opens contemptuously. Bottled Lightning did not see a forecast like this…"* + dim caret `▌`.
- **Stage**: halftone + tangerine speed-lines radiating from the foe; optional CRT scanline overlay (`repeating-linear-gradient 0deg, black 22% 0 2px / transparent 2px 4px`).
  - Foe top-right: `BOTTLED LIGHTNING` (185px fighter), cyan ring at ~40% with cracked tangerine edge + shards + 13 impact particles (tangerine/off-white squares & triangles). Name tape + `ZAP` chip (tangerine).
  - `SUPER EFFECTIVE!` lockup: tangerine display italic 34/26px, ink outline, hard shadow, rotated −7°.
  - Player bottom-left: `PASSIVE-AGGRESSIVE UMBRELLA` (205px), lime ring at ~85%, **idle micro-bounce** (translateY 0→−7px, 1.8s ease-in-out loop). Name tape + `WATER` chip (cyan).
  - Corner mono: `YOUR MOVE · 00:12`.
- **Control panel** (7px hazard-stripe top border, `#121216` bg):
  - 3 **move cards** (equal flex): display-italic name, lime mono power (top-right), type chip, effect line (8.5px, 55% off-white). Selected card: lime 2px border overlay + lime `READY` tab. Cards: `OPEN CONTEMPTUOUSLY 70 WATER — Douses the field. 2× vs FIRE.` / `DRIP CAMPAIGN 40 WATER — Chip damage, 3 turns.` / `SNAP SHUT 90 STEEL — Crits a charged foe. Recoil 1 seg.`
  - **Switch row**: `SWITCH →` mono label, two 56px benched fighters with mini rings (66% / 100%), note `BENCH 2/2 · SWAP COSTS THE TURN`.
- Desktop (1i): fighters left/right (260/240px), commentary centered top, moves row max 720px + bench right of a vertical divider.

### 1c — RESULT CARD + SHARE  ★ identity screen
- **Result card** (8px hazard-stripe border frame around ink panel, halftone): `MATCH #142 · RANKED STREET` tape + `4 TURNS`; `VICTORY` lime display italic 52px hard-shadowed; `KRA-KOW!!` tangerine lockup rotated +6° with tape `FINISHER: SNAP SHUT · 90`; winning squad = three 92px fighters with **final ring states** (85% / 25% cracked / 0% shattered); judge quip italic *"It never even closed. Brutal." — JUDGE K-OS* (attribution cyan mono); footer wordmark `ALCHEMY ARENA` + mono `BROADCAST CH.9 · NO ACCOUNTS · IN-BROWSER`. Exports 1080×1350.
- **Spoiler-free share**: cyan `SPOILER-FREE SHARE` tape; panel with mono Wordle-style grid (platform emoji ARE correct here — it's clipboard text):
  ```
  ALCHEMY ARENA · DAILY #142
  🟩🟩🟧🟩 4 TURNS
  ☂️ 👻 🌵 SQUAD · 2/3 STOOD
  🔥6 🧊1 STREAK · FREEZE HELD
  alchemy.arena/d/142
  ```
- Buttons: `COPY TEXT` (lime fill) + `SAVE CARD ↓` (outlined), both display italic with 5px hard shadows.

### 1d — CODEX + 1e — LINEAGE overlay
- Header `CODEX` display italic 26px + rank tape `ADEPT — 247/∞ · 12 FIRSTS`; 12-cell skewed segment meter (7 lime) + `NEXT RANK: SEER @ 300`.
- Search `FIND A STICKER…`; filter chips: `ALL` (lime fill = active), `FIRE WATER PAPER IDEA` (outlined), `FOIL ◆` (cyan).
- **Sticker-book grid**: 4-up 58px badges with 7px mono names; foils carry rotated holo `FOIL` tab + live shimmer; undiscovered = dashed `?` cells named `???`.
- **Advancements strip** (bottom): `ADVANCEMENTS` tape, `5/9 · NEXT: "CROWN ANYTHING"`, 9 32px nodes (Noto Emoji glyph) joined by 12px connectors — unlocked: lime border/glyph + lime 8% fill; locked: dashed off-white 25%.
- **Lineage overlay (1e)**: full-screen on `#0A0A0C`. Header tape `LINEAGE` + element name + ✕. Ancestry tree drawn root-down with **4px off-white comic-gutter elbow lines** (opacity fades 85→55% per generation): BANNED WEATHER BOOKS ← STORM + LIBRARY; STORM ← AIR + WATER; LIBRARY ← PAPER + IDEA; PAPER ← EARTH + WATER; IDEA ← FIRE + AIR. Primitives labeled cyan with `◦`; legend tape `◦ = PRIMITIVE` + `EVERYTHING TRACES BACK TO FIRE · WATER · EARTH · AIR`. Duplicate ancestors repeat their identical badge.

### 1f — DAILY BOSS
- Tangerine hijack banner: `▓▓░ SIGNAL HIJACK / EVERYONE FIGHTS` (ink text, mono, 3px tracking).
- `TODAY'S WORLDWIDE BOSS` cyan mono; title `THE TAX AUDIT` display italic 44px with **chromatic split** text-shadow (−3px cyan / +3px magenta) + hard black shadow.
- **Boss badge** 230px (tier-4 = most elaborate burst), mid **glitch flicker**: two RGB-split ghost copies (translate ±5px, screen blend, cyan/magenta drop-shadows) over the real badge, jumping on a `steps()` 2.6s loop. Tangerine speed-lines behind. CRT scanlines over the whole frame.
- `NEXT AUDIT 07:41:12` lime mono counter + `BEATEN BY 12,431 ALCHEMISTS` tape.
- **Streak row**: `STREAK 6` + 7 sticker chips (36×44, rotated ±2°, 3px hard shadows): won = lime border + lime ✔; **frozen = cyan border, cyan 12% fill, ❄** ; today = dashed + ▶.
- **Squad select** panel: `PICK YOUR SQUAD` tape + tangerine hint `AUDIT IS PAPER · LAW — WEAK TO FIRE + CHAOS`; two filled 50px badges + dashed `+` slot + tip `SLOT 3 OPEN / TIP: ANYTHING BURNING`.
- CTA `ENTER THE BROADCAST →` lime.

### 1g — FIRST-RUN / TUTORIAL
- Tape: `FIRST BOOT · NO ACCOUNT · RUNS IN YOUR BROWSER`.
- **Neon-sign download indicator** (never a bare progress bar): wordmark `ALCHEMY ARENA` in display italic 36px; downloaded portion = lime letters with lime glow; remainder = transparent fill + 1.5px off-white 22% text-stroke; boundary letter flickers (opacity 1→.15→.4 buzz loop). Below: 6 skewed section cells (4 lit, glowing) + mono `WARMING UP THE LAB — 412/600 MB · SECTION 4/6` + cyan italic *"you can start crafting before the sign is fully lit"*.
- **STEP 2 — YOUR FIRST FUSION** panel (lime tab): `FIRE + WATER = STEAM` badge equation + `FSSSH!` mini lockup; mono `DRAG ONE ONTO THE OTHER — THIS ONE'S PRE-BREWED` (results pre-cached so fusion feels instant mid-download).
- **Type-matchup comic panel** (3px off-white border, hard shadow): WATER badge striking FIRE badge (rotated, 85% opacity) along a glowing cyan vector, `SPLOOSH!` cyan lockup; off-white caption bar: `WATER QUENCHES FIRE` display italic + `2× DAMAGE. REMEMBER IT.` mono.
- CTA `NEXT: WIN YOUR FIRST FIGHT →` lime.

---

## Interactions & Behavior (see also `Fusion Prototype.dc.html` — working reference)

### Fusion flow (implemented in the prototype)
State machine: `idle → slotA filled → slotB filled → brewing (900ms, "BREWING… / THE AI IS INVENTING SOMETHING" pulse) → result | fizzle`.
- Tap/drag element → fills slot A, then B; filling B triggers fusion. Tapping a third element with both slots full restarts with it in A. Tapping a slot clears it.
- Known pair (AI hit) → result slams in; unknown pair → `FIZZLE.` + shake, slots clear.
- New discoveries append to the tray permanently and increment the mono counter; plaque prints name, 2 invented type chips, 3 moves with powers, `FIRST BREW ▲` marker.
- In production the "recipe table" is the local AI; first-run combines are pre-cached.

### Motion spec (global: 150–250ms snaps, ease-out with overshoot)
| Moment | Spec |
|---|---|
| Badge slam-in | 450ms `cubic-bezier(.2,1.4,.4,1)`: scale 2.4→.88→1.08→1, rotate 14°→−5°, one smear frame; 14 particles fly outward 70px, 700ms fade; container shake 280ms |
| Burst lockups | pop 400ms: scale 0→1.25→1, delayed 250ms after slam |
| Attack hit | 90ms hit-stop (freeze both fighters) then screen shake; smear frame along attack vector |
| Ring damage | segments crack tangerine + shard lines; at zero: segments explode outward as debris |
| Turn change | diagonal comic-panel wipe (ink) |
| Active fighter idle | translateY 0→−7px, 1.8s ease-in-out infinite |
| Foil shimmer | `hue-rotate(0→360deg)` 5s linear infinite |
| Boss reveal | glitch flicker: `steps(1)` jumps, translate ±5px + skew ±5°, RGB-split ghosts |
| Neon letters | buzz-flicker on as each model shard caches |
| Codex stickers | peel-press in, 40ms stagger on scroll |
| Lineage tree | gutter lines draw root-down via stroke-dash, 220ms/generation; badges stamp at junctions |
| COPY button | lime flash → `COPIED` tape |

### State management (production)
- `collection`: discovered elements (name, glyph, ink color, tier, foil?, types, moves, lineage parents) — persist in IndexedDB/localStorage (no accounts).
- `battle`: turn number, per-fighter HP segments (int 0–12), active/bench, move selection, commentary stream.
- `daily`: boss id, countdown, streak days + freeze tokens, global beaten-count (single fetch).
- `firstRun`: download progress (bytes + shard/section index), tutorial step.
- Share text is generated client-side; result card renders to 1080×1350 canvas/PNG.

## Assets
None — no images. Everything is procedural: Google Fonts (Archivo Black, Archivo, JetBrains Mono, **Noto Emoji**) + generated SVG badges/rings + CSS gradients. Do not substitute colorful platform emoji for element art.

## Files
- `Alchemy Arena Artboards.dc.html` — all 8 artboards + SYS card (canvas ids 1a–1i); badge/ring/particle generators in its `class Component` script.
- `Fusion Prototype.dc.html` — working fusion interaction with full state machine, 16-recipe table, slam/fizzle motion.
