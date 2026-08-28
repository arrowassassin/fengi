import { describe, expect, it } from "vitest";
import { STARTERS } from "../content/starters";
import { deserializeSpecimen, serializeSpecimen } from "./codec";
import { MemoryBackend, VersionedStore } from "./store";

describe("versioned store", () => {
  it("round-trips JSON values with a version stamp", () => {
    const store = new VersionedStore(new MemoryBackend(), "aa-test", 1);
    store.set("greeting", { hello: "world" });
    expect(store.get<{ hello: string }>("greeting")).toEqual({ hello: "world" });
  });

  it("drops values written under a different schema version", () => {
    const backend = new MemoryBackend();
    new VersionedStore(backend, "aa-test", 1).set("k", { n: 1 });
    expect(new VersionedStore(backend, "aa-test", 2).get("k")).toBeUndefined();
  });

  it("survives corrupted backend payloads", () => {
    const backend = new MemoryBackend();
    backend.setItem("aa-test:k", "{not json");
    expect(new VersionedStore(backend, "aa-test", 1).get("k")).toBeUndefined();
  });
});

describe("specimen codec (bigint-safe persistence)", () => {
  it("round-trips every starter exactly", () => {
    for (const starter of STARTERS) {
      const restored = deserializeSpecimen(serializeSpecimen(starter));
      expect(restored).toEqual(starter);
    }
  });
});
