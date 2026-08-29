# Alchemy Arena

A zero-install browser game: fuse elements on the workbench — an in-browser
LLM (WebLLM) invents each fusion's **name, emoji, invented types, and 3
moves** — then fight Pokémon-style 3-squad battles run by a **deterministic
engine** (the LLM only commentates, never decides). Underground-lab ×
televised-street-fight identity from the approved Claude Design handoff:
procedural holo-decal badges, segmented HP rings, hard-edged die-cut UI.

- **Design handoff (source of truth for visuals):** [`design/claude-design-export/`](design/claude-design-export/README.md)
- **Spec:** [`docs/superpowers/specs/2026-08-27-alchemy-arena-design.md`](docs/superpowers/specs/2026-08-27-alchemy-arena-design.md)
- **Plan:** [`docs/plans/2026-08-28-alchemy-arena-implementation.md`](docs/plans/2026-08-28-alchemy-arena-implementation.md)
- **Design ↔ spec decision log:** [`game/src/design/COMPONENTS.md`](game/src/design/COMPONENTS.md)

## Develop

```bash
cd game
npm ci
npm run dev         # local dev server
npm test            # vitest + fast-check property suites
npm run check       # biome + tsc strict + tests
npm run build       # production build (tsc gate + vite)
npm run eval:craft  # W1-2 craft-quality harness (hosted gate via CRAFT_API_URL)
```

## Guarantees

- **Determinism:** same squads + seed + choices → byte-identical battle log
  (property-tested). Same element → identical badge art on every device
  (64-bit recipe-hash seeded).
- **Engine purity:** `game/src/engine/` has no UI/DOM imports — enforced by an
  automated boundary test in CI.
- **Crafting never fails:** invalid/unreachable LLM output degrades through
  bounded retries to a seeded deterministic generator. Freeform invented type
  labels map deterministically onto the 12-way mechanical chart.
- **Design tokens only:** every screen styles via
  [`game/src/design/tokens.css`](game/src/design/tokens.css).

## Services

- **On-device oracle:** opt-in toggle (home screen) enables WebLLM crafting;
  the model streams into the browser cache on first fuse (lazy ~6 MB runtime
  chunk + model download).
- **Edge recipe registry:** first-discovery credits sync globally when
  `VITE_REGISTRY_URL` points at the deployable Cloudflare Worker in
  [`infra/registry-worker/`](infra/registry-worker/worker.js); otherwise a
  local registry keeps credits per-device.

CI runs lint (Biome), strict typecheck, tests, and a production build;
`main` deploys to GitHub Pages.
