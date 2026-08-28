import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { STARTERS } from "../src/content/starters";
import { DeterministicAdapter } from "../src/craft/adapters/deterministic";
import { HostedApiAdapter } from "../src/craft/adapters/hostedApi";
import type { CraftAdapter } from "../src/craft/adapters/types";
import { craftElement } from "../src/craft/pipeline";
import type { Specimen } from "../src/engine";

/**
 * W1–2 go/no-go harness (spec §10). Offline it exercises the deterministic
 * adapter so CI proves the harness mechanics; with CRAFT_API_URL set it runs
 * the hosted ~1B gate and enforces the RUBRIC.md thresholds.
 */

interface Corpus {
  pairs: [string, string][];
  extras: [string, string, string][];
}

const corpus = JSON.parse(readFileSync(join(__dirname, "recipes.json"), "utf8")) as Corpus;

const byId = new Map(STARTERS.map((s) => [s.id, s]));

function resolvePair(a: string, b: string): [Specimen, Specimen] {
  const pa = byId.get(a);
  const pb = byId.get(b);
  if (pa === undefined || pb === undefined) throw new Error(`unknown starter ${a}/${b}`);
  return [pa, pb];
}

function makeAdapter(): { adapter: CraftAdapter; hosted: boolean } {
  const url = process.env.CRAFT_API_URL;
  if (url !== undefined && url !== "") {
    const config: ConstructorParameters<typeof HostedApiAdapter>[0] = {
      url,
      model: process.env.CRAFT_MODEL ?? "llama-3.2-1b-instruct",
    };
    const key = process.env.CRAFT_API_KEY;
    if (key !== undefined) config.apiKey = key;
    return { adapter: new HostedApiAdapter(config), hosted: true };
  }
  return { adapter: new DeterministicAdapter(), hosted: false };
}

describe("craft eval harness (W1-2 gate)", () => {
  it("runs the 60-recipe corpus and reports rubric metrics", { timeout: 600_000 }, async () => {
    const { adapter, hosted } = makeAdapter();
    const recipes: [string, string][] = [
      ...corpus.pairs,
      ...corpus.extras.map(([a, b]) => [a, b] as [string, string]),
    ];
    expect(recipes.length).toBe(60);

    let schemaValid = 0;
    let nameNovel = 0;
    let typesPlausible = 0;
    let movesDistinct = 0;
    let rubricPass = 0;

    for (const [a, b] of recipes) {
      const [pa, pb] = resolvePair(a, b);
      const result = await craftElement(pa, pb, adapter);
      const s = result.specimen;
      const okSchema = result.provenance === "llm";
      const okName =
        s.name.toLowerCase() !== pa.name.toLowerCase() &&
        s.name.toLowerCase() !== pb.name.toLowerCase();
      const parentTypes = new Set([...pa.types, ...pb.types]);
      const newTypes = s.types.filter((t) => !parentTypes.has(t));
      const okTypes = newTypes.length <= 1;
      const okMoves = new Set(s.moves.map((m) => m.name.toLowerCase())).size === 4;
      if (okSchema) schemaValid++;
      if (okName) nameNovel++;
      if (okTypes) typesPlausible++;
      if (okMoves) movesDistinct++;
      if (okSchema && okName && okTypes && okMoves) rubricPass++;
    }

    const pct = (n: number): number => Math.round((n / recipes.length) * 1000) / 10;
    const summary = {
      mode: hosted ? "hosted-1b-gate" : "offline-deterministic",
      schemaValid: pct(schemaValid),
      nameNovel: pct(nameNovel),
      typesPlausible: pct(typesPlausible),
      movesDistinct: pct(movesDistinct),
      rubricPass: pct(rubricPass),
    };
    // eslint-disable-next-line no-console
    console.log(`CRAFT-EVAL ${JSON.stringify(summary)}`);

    if (hosted) {
      // RUBRIC.md go thresholds — the actual W1-2 gate.
      expect(summary.schemaValid).toBeGreaterThanOrEqual(95);
      expect(summary.rubricPass).toBeGreaterThanOrEqual(80);
    } else {
      // Offline: prove the harness and fallback mechanics.
      expect(summary.schemaValid).toBe(100);
      expect(summary.movesDistinct).toBeGreaterThanOrEqual(90);
    }
  });
});
