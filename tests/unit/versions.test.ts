import { describe, expect, it } from "vitest";
import {
  gameReleases,
  games,
  sessionFor,
  sessionFromId,
  sessionHref,
  supportsVersion,
} from "../../src/games/registry";
import { createPuzzle } from "../../src/games/signal/v1/engine";
import { makeRecord } from "../../src/lib/persistence";
import { validateSave } from "../../src/server/validate-save";

describe("rule version continuity", () => {
  const future = [
    {
      id: "signal" as const,
      version: 2,
      releases: [
        { version: 1, from: "0000-01-01" },
        { version: 2, from: "2026-12-01" },
      ],
    },
  ];
  it("uses the registered version for practice and activation dates for daily archives", () => {
    expect(
      sessionFor("signal", new URLSearchParams("mode=practice"), "2026-12-02", future).id,
    ).toContain(":v2:");
    expect(
      sessionFor("signal", new URLSearchParams("date=2026-11-04"), "2026-12-02", future).id,
    ).toContain(":v1:");
    expect(sessionFor("signal", new URLSearchParams(), "2026-12-02", future).id).toContain(":v2:");
  });
  it("preserves old saved session IDs and explicit version links across upgrades", () => {
    const old = sessionFromId("signal:v1:practice:original:standard");
    expect(old).not.toBeNull();
    if (!old) throw new Error("Missing old session");
    const query = new URL(sessionHref(old), "https://test.invalid").searchParams;
    expect(sessionFor("signal", query, "2026-12-02", future)).toEqual(old);
    const record = makeRecord(
      old,
      { cells: createPuzzle(old.seed).givens, history: [], moves: 0, hints: 0 },
      false,
      "",
    );
    expect(validateSave(record).id).toBe(old.id);
  });
  it("does not map unknown versions or malformed IDs onto the current engine", () => {
    const unknown = sessionFor("signal", new URLSearchParams("version=999"));
    expect(supportsVersion("signal", unknown.rulesVersion)).toBe(false);
    expect(() => validateSave(makeRecord(unknown, {}, false, ""))).toThrow();
    expect(sessionFromId("signal:v1:daily:not-a-date:standard")).toBeNull();
    expect(sessionFromId("signal:v1:practice:test:calm")).toBeNull();
    expect(sessionFor("signal", new URLSearchParams("version=bad")).rulesVersion).toBe(0);
  });
  it("requires every current registry version to have a retained release", () => {
    for (const game of games) {
      expect(gameReleases.find((g) => g.id === game.id)?.version).toBe(game.version);
      expect(supportsVersion(game.id, game.version)).toBe(true);
    }
  });
});
