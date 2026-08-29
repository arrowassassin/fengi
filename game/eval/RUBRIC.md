# W1–2 go/no-go rubric — craft + moveset quality on a ~1B model

**Gate (spec §10, locked):** evaluate on a **hosted API first** (a ~1B-class
instruct model, e.g. Llama-3.2-1B / Qwen-0.6B class) before any in-browser
investment. WebLLM re-runs this same gate on-device in W13.

## How to run

- Offline harness check (CI, deterministic adapter): `npm run eval:craft`
- Hosted gate: `CRAFT_API_URL=https://…/v1/chat/completions CRAFT_API_KEY=… CRAFT_MODEL=llama-3.2-1b-instruct npm run eval:craft`

The harness runs the 60-recipe corpus in `eval/recipes.json` through the craft
pipeline and reports per-metric rates plus a machine-readable summary.

## Metrics & thresholds

| Metric | Definition | Go threshold |
|---|---|---|
| Schema validity | `parseCrafted` accepts within ≤2 retries | **≥ 95%** |
| Name novelty | name is not a verbatim copy of either parent | ≥ 90% |
| Type plausibility | every result type appears in a parent, or ≤1 new type | ≥ 80% |
| Move-name distinctness | 4 moves have 4 distinct names | ≥ 90% |
| Rubric pass (aggregate) | a recipe passing all of the above | **≥ 80%** |

## Decision

- **GO:** both bold thresholds met → keep LLM crafting as the launch path
  (hosted first, WebLLM behind the W13 re-gate).
- **NO-GO:** launch on `DeterministicAdapter` crafting, keep LLM path behind a
  flag, re-evaluate with a better small model in W13.

Record hosted-run results in this file's changelog section below.

## Changelog

- 2026-08-28: harness landed; offline (deterministic-adapter) run passes 100%
  mechanically. Hosted ~1B run pending credentials — **gate decision open**.
