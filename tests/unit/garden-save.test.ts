import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { generatedPuzzle } from "../../src/games/generated-content";
import { initialOrbit } from "../../src/games/orbit/v1/engine";
import { sessionFor } from "../../src/games/registry";
import { makeRecord } from "../../src/lib/persistence";
import { draftContent } from "../../src/server/content-draft";
import { EditorialStore } from "../../src/server/editorial";
import { validateSave } from "../../src/server/validate-save";
import { fixturePack } from "../fixtures/generated-pack";

it("server validates retained reviewed layouts and rejects draft/forged progress", async () => {
  const dir = mkdtempSync(join(tmpdir(), "garden-save-")),
    previous = process.env.FENGI_EDITORIAL_PATH;
  process.env.FENGI_EDITORIAL_PATH = join(dir, "editorial.sqlite");
  const store = new EditorialStore(process.env.FENGI_EDITORIAL_PATH);
  try {
    const draft = await draftContent("fixture", {});
    draft.pack = fixturePack;
    draft.garden = { walls: [7, 8, 9, 10], seeds: [6, 18, 28] };
    const e = store.create(draft, "", "test rights");
    if (!e) throw new Error("fixture");
    const session = sessionFor(
      "trail",
      new URLSearchParams({ mode: "practice", version: "2", seed: e.id }),
    );
    const record = makeRecord(session, { version: 1, path: [0, 6] }, false, "untrusted summary");
    expect(() => validateSave(record)).toThrow();
    store.transition(e.id, e.digest, "approve", "test");
    store.transition(e.id, e.digest, "publish", "test");
    expect(validateSave(record).completed).toBe(false);
    for (const game of ["signal", "pairs", "orbit"] as const) {
      const s = sessionFor(
        game,
        new URLSearchParams({ mode: "practice", version: "2", seed: e.id }),
      );
      const initial =
        game === "signal"
          ? { cells: generatedPuzzle(fixturePack.signal).givens, history: [], moves: 0, hints: 0 }
          : game === "pairs"
            ? { matched: [], turns: 0 }
            : initialOrbit();
      expect(validateSave(makeRecord(s, initial, false, "forged summary")).summary).toContain(
        "unranked",
      );
      expect(() => validateSave(makeRecord(s, { malformed: true }, true, "forged"))).toThrow();
    }
    expect(() => validateSave({ ...record, state: { version: 1, path: [0, 35] } })).toThrow();
    store.transition(e.id, e.digest, "revoke", "test");
    expect(validateSave(record).state).toEqual({ version: 1, path: [0, 6] });
  } finally {
    store.db.close();
    if (previous === undefined) delete process.env.FENGI_EDITORIAL_PATH;
    else process.env.FENGI_EDITORIAL_PATH = previous;
    rmSync(dir, { recursive: true, force: true });
  }
});
