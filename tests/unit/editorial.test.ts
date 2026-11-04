import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { dailyPrompts } from "../../src/games/odd/engine";
import { sessionFor } from "../../src/games/registry";
import { draftContent } from "../../src/server/content-draft";
import { EditorialStore } from "../../src/server/editorial";

describe("operator editorial lifecycle", () => {
  it("persists reviewed collections, plays their exact categories and revokes without changing saved editions", async () => {
    const dir = mkdtempSync(join(tmpdir(), "fengi-editorial-")),
      path = join(dir, "editorial.sqlite");
    let store = new EditorialStore(path);
    try {
      const draft = await draftContent("fixture", {});
      const edition = store.create(draft, "", "Original curated fixture; no model call");
      if (!edition) throw new Error("No draft");
      expect(edition.source).toBe("deterministic");
      expect(store.published()).toEqual([]);
      expect(() => store.transition(edition.id, edition.digest, "publish", "operator")).toThrow();
      expect(() => store.transition(edition.id, "stale", "approve", "reviewer")).toThrow();
      store.transition(edition.id, edition.digest, "approve", "reviewer");
      expect(store.published()).toEqual([]);
      store.transition(edition.id, edition.digest, "publish", "publisher");
      store.db.close();
      store = new EditorialStore(path);
      expect(store.published()).toHaveLength(1);
      const session = sessionFor(
        "odd",
        new URLSearchParams({ mode: "practice", seed: edition.seed, version: "1" }),
      );
      expect(dailyPrompts(session.seed).map((c) => c.id)).toEqual(edition.categoryIds);
      store.transition(edition.id, edition.digest, "revoke", "publisher");
      expect(store.published()).toEqual([]);
      expect(dailyPrompts(session.seed).map((c) => c.id)).toEqual(edition.categoryIds);
      expect(store.db.prepare("SELECT * FROM editorial_events").all()).toHaveLength(3);
    } finally {
      store.db.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it("rejects missing rights, invalid content and tampered stored data", async () => {
    const store = new EditorialStore(":memory:");
    try {
      const draft = await draftContent("fixture", {});
      expect(() => store.create(draft, "", "")).toThrow();
      expect(() => store.create({ ...draft, title: "" }, "", "fixture")).toThrow();
      const edition = store.create(draft, "", "fixture");
      if (!edition) throw new Error("No draft");
      store.db.prepare("UPDATE editions SET body='{}' WHERE id=?").run(edition.id);
      expect(() => store.get(edition.id)).toThrow(/integrity/);
    } finally {
      store.db.close();
    }
  });
});
