import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { sessionFor } from "../../src/games/registry";
import { makeRecord } from "../../src/lib/persistence";
import { ProgressStore } from "../../src/server/store";
import { validateSave } from "../../src/server/validate-save";

const paths: string[] = [];
afterEach(() => {
  for (const path of paths.splice(0)) rmSync(path, { recursive: true, force: true });
});
const sample = () =>
  validateSave(
    makeRecord(
      sessionFor("pairs", new URLSearchParams("mode=practice&seed=durable")),
      { matched: [], turns: 0 },
      true,
      "fake score",
    ),
  );
function disk() {
  const path = mkdtempSync(join(tmpdir(), "fengi-store-"));
  paths.push(path);
  return join(path, "progress.sqlite");
}
describe("durable isolated progress", () => {
  it("survives process-style close/reopen and backup/restore with credentials", async () => {
    const path = disk(),
      store = new ProgressStore(path),
      secret = store.create(),
      id = store.identify(secret);
    if (!id) throw new Error("Missing identity");
    store.save(id, sample(), 0, randomUUID());
    const backup = join(paths.at(-1) ?? "", "backup.sqlite");
    await store.db.backup(backup);
    store.close();
    const reopened = new ProgressStore(path);
    expect(reopened.list(id)[0].revision).toBe(1);
    reopened.close();
    const restored = new ProgressStore(backup);
    expect(restored.identify(secret)).toBe(id);
    expect(restored.list(id)[0].record.completed).toBe(false);
    expect(restored.db.pragma("integrity_check", { simple: true })).toBe("ok");
    restored.close();
  });
  it("rejects stale concurrent writes and handles retries idempotently", () => {
    const path = disk(),
      a = new ProgressStore(path),
      b = new ProgressStore(path),
      id = a.identify(a.create());
    if (!id) throw new Error("Missing identity");
    const mutation = randomUUID(),
      record = sample();
    expect(a.save(id, record, 0, mutation).revision).toBe(1);
    expect(b.save(id, record, 0, mutation).revision).toBe(1);
    expect(() => b.save(id, record, 0, randomUUID())).toThrow(/changed/);
    expect(b.save(id, record, 1, randomUUID()).revision).toBe(2);
    a.close();
    b.close();
  });
  it("isolates profiles, hashes credentials, consumes recovery codes and deletes all sessions", () => {
    const store = new ProgressStore(disk()),
      secret = store.create(),
      id = store.identify(secret),
      other = store.identify(store.create());
    if (!id || !other) throw new Error("Missing identity");
    store.save(id, sample(), 0, randomUUID());
    expect(store.list(other)).toEqual([]);
    const code = store.recovery(id),
      newSession = store.recover(code);
    expect(store.identify(newSession)).toBe(id);
    expect(() => store.recover(code)).toThrow(/invalid/);
    const raw = JSON.stringify(store.db.prepare("SELECT * FROM sessions").all());
    expect(raw).not.toContain(secret);
    expect(raw).not.toContain(newSession);
    store.delete(id);
    expect(store.identify(secret)).toBeNull();
    expect(store.identify(newSession)).toBeNull();
    expect(store.list(id)).toEqual([]);
    store.close();
  });
  it("enforces request budgets and rejects invalid state and spoofed identity", () => {
    const store = new ProgressStore(disk());
    store.limit("test", 1);
    expect(() => store.limit("test", 1)).toThrow(/Too many/);
    store.close();
    const record = sample();
    expect(() => validateSave({ ...record, game: "signal" })).toThrow();
    expect(() => validateSave({ ...record, state: { matched: [0], turns: 0 } })).toThrow();
    expect(validateSave({ ...record, completed: true, summary: "999 points" }).completed).toBe(
      false,
    );
  });
});
