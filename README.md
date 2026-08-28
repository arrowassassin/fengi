# Alchemy Arena

A zero-install browser game: fuse elements on an alchemist's workbench — an
in-browser LLM (WebLLM) invents each fusion's name, emoji, types, and moves —
then battle Pokémon-style with 3-specimen squads run by a **deterministic
engine** (the LLM only commentates, never decides).

- **Spec:** [`docs/superpowers/specs/2026-08-27-alchemy-arena-design.md`](docs/superpowers/specs/2026-08-27-alchemy-arena-design.md)
- **Plan:** [`docs/plans/2026-08-28-alchemy-arena-implementation.md`](docs/plans/2026-08-28-alchemy-arena-implementation.md)
- **Art prototype:** [`docs/prototypes/sigil-seals-demo.html`](docs/prototypes/sigil-seals-demo.html)

## Develop

```bash
cd game
npm ci
npm run dev      # local dev server
npm test         # vitest + fast-check property suites
npm run check    # biome + tsc strict + tests
npm run build    # production build (tsc gate + vite)
npm run eval:craft  # W1-2 craft-quality harness (hosted gate via CRAFT_API_URL)
```

## Guarantees

- **Determinism:** same squads + seed + choices → byte-identical battle log
  (property-tested; gate for all rendering work).
- **Engine purity:** `game/src/engine/` has no UI/DOM imports — enforced by an
  automated boundary test in CI.
- **Crafting never fails:** invalid/unreachable LLM output degrades through
  bounded retries to a seeded deterministic generator.
- **Design tokens only:** every screen styles via
  [`game/src/design/tokens.css`](game/src/design/tokens.css).

CI runs lint (Biome), strict typecheck, tests, and a production build;
`main` deploys to GitHub Pages.
