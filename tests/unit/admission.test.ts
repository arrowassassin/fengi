import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { sessionFor } from "../../src/games/registry";
import { makeRecord } from "../../src/lib/persistence";
import { requestActor } from "../../src/server/admission";
import { DATABASE_VERSION, PROVISIONAL_TTL_MS, ProgressStore } from "../../src/server/store";

describe("caller-scoped admission", () => {
  it("does not let one caller consume another's creation allowance, including the hourly window", () => {
    let now = 100000;
    const db = new ProgressStore(":memory:", () => now);
    for (let minute = 0; minute < 4; minute++) {
      for (let i = 0; i < 5; i++) db.admitCreation("203.0.113.1");
      expect(() => db.admitCreation("203.0.113.1")).toThrow(/Too many/);
      now += 60001;
    }
    expect(() => db.admitCreation("203.0.113.1")).toThrow(/Too many/);
    expect(() => db.admitCreation("203.0.113.2")).not.toThrow();
    expect(JSON.stringify(db.db.prepare("SELECT bucket FROM rate_limits").all())).not.toContain(
      "203.0.113",
    );
    now += 3600000;
    expect(() => db.admitCreation("203.0.113.1")).not.toThrow();
    db.close();
  });
  it("valid recovery is independent of exhausted unauthenticated buckets", () => {
    const db = new ProgressStore(":memory:"),
      id = db.identify(db.create());
    if (!id) throw new Error("Missing identity");
    const code = db.recovery(id);
    for (let i = 0; i < 10; i++) db.limitInvalidRecovery("203.0.113.1");
    expect(() => db.limitInvalidRecovery("203.0.113.1")).toThrow();
    expect(() => db.limitInvalidRecovery("203.0.113.2")).not.toThrow();
    expect(db.hasRecovery(code)).toBe(true);
    expect(db.identify(db.recover(code))).toBe(id);
    db.close();
  });
  it("fails closed without trusted ingress and ignores unconfigured forwarding headers", () => {
    const request = new Request("https://play.example/api/profile", {
      headers: { "X-Forwarded-For": "203.0.113.99", "X-Fengi-Client-IP": "203.0.113.5" },
    });
    expect(() => requestActor(request, { FENGI_ORIGIN: "https://play.example" })).toThrow(
      /trusted ingress/,
    );
    expect(
      requestActor(request, {
        FENGI_ORIGIN: "https://play.example",
        FENGI_CLIENT_IP_HEADER: "x-fengi-client-ip",
      }),
    ).toBe("203.0.113.5");
    expect(() =>
      requestActor(
        new Request(request, { headers: { "X-Fengi-Client-IP": "203.0.113.1, 203.0.113.2" } }),
        { FENGI_ORIGIN: "https://play.example", FENGI_CLIENT_IP_HEADER: "x-fengi-client-ip" },
      ),
    ).toThrow(/address/);
  });
});
describe("bounded empty-profile lifecycle", () => {
  it("expires only inactive, never-saved, unrecoverable profiles after their sessions expire", () => {
    let now = Date.now();
    const db = new ProgressStore(":memory:", () => now);
    const empty = db.identify(db.create()),
      active = db.identify(db.create()),
      saved = db.identify(db.create()),
      recoverable = db.identify(db.create());
    if (!empty || !active || !saved || !recoverable) throw new Error("Missing profiles");
    const activeToken = (
      db.db.prepare("SELECT hash FROM sessions WHERE profile=?").get(active) as { hash: string }
    ).hash;
    db.save(
      saved,
      makeRecord(
        sessionFor("pairs", new URLSearchParams("mode=practice&seed=retained")),
        { matched: [], turns: 1 },
        false,
        "",
      ),
      0,
      crypto.randomUUID(),
    );
    const code = db.recovery(recoverable);
    now += PROVISIONAL_TTL_MS + 1;
    db.db.prepare("UPDATE sessions SET expires=? WHERE hash=?").run(now + 10000, activeToken);
    expect(db.cleanup(true)).toBe(1);
    expect(db.cleanup()).toBe(1);
    expect(db.db.prepare("SELECT id FROM profiles WHERE id=?").get(empty)).toBeUndefined();
    expect(db.db.prepare("SELECT id FROM profiles WHERE id=?").get(active)).toBeDefined();
    now += 400 * PROVISIONAL_TTL_MS;
    db.cleanup();
    expect(db.list(saved)).toHaveLength(1);
    expect(db.hasRecovery(code)).toBe(true);
    db.close();
  });
  it("migrates old profiles conservatively without deleting or rewriting saves", () => {
    const directory = mkdtempSync(join(tmpdir(), "fengi-migration-")),
      path = join(directory, "old.sqlite");
    try {
      const old = new Database(path);
      old.exec(
        "CREATE TABLE profiles(id TEXT PRIMARY KEY,recovery_hash TEXT UNIQUE,created INTEGER NOT NULL); INSERT INTO profiles VALUES('old-profile',NULL,1); PRAGMA user_version=1;",
      );
      old.close();
      const db = new ProgressStore(path);
      expect(db.db.pragma("user_version", { simple: true })).toBe(DATABASE_VERSION);
      expect(db.isRetained("old-profile")).toBe(true);
      expect(db.cleanup()).toBe(0);
      db.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
