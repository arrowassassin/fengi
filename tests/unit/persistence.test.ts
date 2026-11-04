import { describe, expect, it } from "vitest";
import { sessionFor } from "../../src/games/registry";
import {
  makeRecord,
  RECORD_PREFIX,
  readAllRecords,
  readRecord,
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

describe("retained pending records beyond the display limit", () => {
  function browserStorage(): StorageLike {
    const map = new Map<string, string>();
    return {
      get length() {
        return map.size;
      },
      key: (i) => [...map.keys()][i] ?? null,
      getItem: (key) => map.get(key) ?? null,
      setItem: (key, value) => {
        map.set(key, value);
      },
      removeItem: (key) => {
        map.delete(key);
      },
    };
  }
  it("separates exact lookup, display limits and complete recovery export", () => {
    const store = browserStorage();
    for (let i = 0; i < 75; i++)
      saveRecord(store, {
        ...makeRecord(
          sessionFor("pairs", new URLSearchParams(`mode=practice&seed=retain-${i}`)),
          { matched: [], turns: i + 5 },
          false,
          "In progress",
        ),
        updated: i + 1,
        pending: true,
        baseRevision: 0,
      });
    expect(readRecords(store)).toHaveLength(60);
    expect(readAllRecords(store)).toHaveLength(75);
    expect(readRecord(store, "pairs:v1:practice:retain-0:standard")?.state).toEqual({
      matched: [],
      turns: 5,
    });
  });
  it("finds original envelope saves and ignores malformed keyed records safely", () => {
    const store = browserStorage(),
      record = makeRecord(
        sessionFor("pairs", new URLSearchParams("mode=practice&seed=legacy")),
        { matched: [], turns: 7 },
        false,
        "",
      );
    store.setItem(STORAGE_KEY, JSON.stringify([record]));
    store.setItem(RECORD_PREFIX + record.id, "invalid json");
    expect(readRecord(store, record.id)?.state).toEqual(record.state);
  });
});

it("history display limits never delete another session's retained cache", () => {
  const map = new Map<string, string>();
  const storage: StorageLike = {
    get length() {
      return map.size;
    },
    key: (i) => [...map.keys()][i] ?? null,
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: () => {
      throw new Error("A save must not prune another editor's session");
    },
  };
  for (let i = 0; i < 65; i++)
    saveRecord(storage, {
      ...makeRecord(
        sessionFor("pairs", new URLSearchParams(`mode=practice&seed=cache-${i}`)),
        { matched: [], turns: 0 },
        false,
        "",
      ),
      updated: i,
    });
  expect(readRecords(storage)).toHaveLength(60);
  expect(readAllRecords(storage)).toHaveLength(65);
});
