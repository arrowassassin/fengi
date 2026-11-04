import { describe, expect, it } from "vitest";
import { sessionFor } from "../../src/games/registry";
import {
  makeRecord,
  readRecords,
  STORAGE_KEY,
  type StorageLike,
  saveRecord,
} from "../../src/lib/persistence";

function memory(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
  };
}
describe("bounded persistence", () => {
  it("round-trips and replaces one session without losing others", () => {
    const store = memory(),
      session = sessionFor("signal", new URLSearchParams(), "2026-11-04");
    saveRecord(store, makeRecord(session, { cells: [1] }, false, "Started"));
    saveRecord(store, makeRecord(session, { cells: [2] }, true, "Complete"));
    expect(readRecords(store)).toHaveLength(1);
    expect(readRecords(store)[0].completed).toBe(true);
  });
  it("ignores malformed and old records", () => {
    const store = memory();
    store.setItem(STORAGE_KEY, "{oops");
    expect(readRecords(store)).toEqual([]);
    store.setItem(STORAGE_KEY, JSON.stringify([{ version: 0 }, { version: 1, id: "bad" }]));
    expect(readRecords(store)).toEqual([]);
  });
  it("caps recent records at 60", () => {
    const store = memory();
    for (let i = 0; i < 70; i++)
      saveRecord(
        store,
        makeRecord(
          sessionFor("pairs", new URLSearchParams(`mode=practice&seed=${i}`)),
          {},
          false,
          "Started",
        ),
      );
    expect(readRecords(store)).toHaveLength(60);
    expect(readRecords(store)[0].id).toContain(":69:");
  });
  it("does not silently swallow storage denial", () => {
    expect(() =>
      readRecords({
        getItem: () => {
          throw new Error("blocked");
        },
        setItem: () => {},
      }),
    ).toThrow("blocked");
  });
});
