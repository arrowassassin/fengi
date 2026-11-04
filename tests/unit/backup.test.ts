import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import Database from "better-sqlite3";
import { expect, it } from "vitest";
import { verifyBundle } from "../../src/server/backup";
import { EditorialStore } from "../../src/server/editorial";
import { ProgressStore } from "../../src/server/store";

it("requires both snapshots and rejects editorial corruption and unsupported schemas", () => {
  const dir = mkdtempSync(join(tmpdir(), "fengi-backup-test-"));
  try {
    const progress = new ProgressStore(join(dir, "progress.sqlite"));
    progress.close();
    expect(() => verifyBundle(dir)).toThrow();
    const editorial = new EditorialStore(join(dir, "editorial.sqlite"));
    editorial.db.close();
    expect(() => verifyBundle(dir)).not.toThrow();
    const db = new Database(join(dir, "editorial.sqlite"));
    db.prepare("INSERT INTO editions(id,body,digest,state,created) VALUES(?,?,?,?,?)").run(
      "bad",
      "{}",
      "invalid",
      "published",
      0,
    );
    expect(() => verifyBundle(dir)).toThrow("digest");
    db.prepare("DELETE FROM editions").run();
    db.pragma("user_version = 999");
    db.close();
    expect(() => verifyBundle(dir)).toThrow("schema");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

it("backs up with default arguments from a fresh directory without overwriting a bundle", () => {
  const dir = mkdtempSync(join(tmpdir(), "fengi-backup-cli-"));
  const script = resolve("scripts/backup.ts"),
    loader = resolve("node_modules/tsx/dist/loader.mjs");
  const options = {
    cwd: dir,
    env: {
      ...process.env,
      FENGI_DATABASE_PATH: join(dir, "data/progress.sqlite"),
      FENGI_EDITORIAL_PATH: join(dir, "data/editorial.sqlite"),
    },
    stdio: "pipe" as const,
  };
  try {
    execFileSync(process.execPath, ["--import", loader, script], options);
    const bundles = readdirSync(join(dir, "backups"));
    expect(bundles).toHaveLength(1);
    const destination = join(dir, "backups", bundles[0]);
    verifyBundle(destination);
    const marker = readFileSync(join(destination, "complete.json"), "utf8");
    expect(() =>
      execFileSync(process.execPath, ["--import", loader, script, destination], options),
    ).toThrow();
    expect(readFileSync(join(destination, "complete.json"), "utf8")).toBe(marker);
    verifyBundle(destination);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

it("verifies populated garden pairs after backup/restore and rejects a missing retained layout", async () => {
  const dir = mkdtempSync(join(tmpdir(), "paired-garden-"));
  const source = join(dir, "source"),
    bundle = join(dir, "bundle"),
    restored = join(dir, "restored");
  const progress = new ProgressStore(join(source, "progress.sqlite"));
  const editorial = new EditorialStore(join(source, "editorial.sqlite"));
  try {
    const { draftContent } = await import("../../src/server/content-draft");
    const draft = await draftContent("fixture", {});
    draft.garden = { walls: [7, 8, 9, 10], seeds: [6, 18, 28] };
    const e = editorial.create(draft, "", "test rights");
    if (!e) throw new Error("fixture");
    editorial.transition(e.id, e.digest, "approve", "test");
    editorial.transition(e.id, e.digest, "publish", "test");
    const id = `trail:v2:practice:${e.id}:standard`;
    progress.db
      .prepare("INSERT INTO profiles(id,recovery_hash,created) VALUES(?,NULL,?)")
      .run("test-profile", Date.now());
    progress.db
      .prepare("INSERT INTO saves(profile,id,revision,mutation,body,updated) VALUES(?,?,?,?,?,?)")
      .run(
        "test-profile",
        id,
        1,
        "test",
        JSON.stringify({ id, state: { version: 1, path: [0, 6] } }),
        Date.now(),
      );
    const loader = resolve("node_modules/tsx/dist/loader.mjs");
    execFileSync(process.execPath, ["--import", loader, resolve("scripts/backup.ts"), bundle], {
      env: {
        ...process.env,
        FENGI_DATABASE_PATH: join(source, "progress.sqlite"),
        FENGI_EDITORIAL_PATH: join(source, "editorial.sqlite"),
      },
      stdio: "pipe",
    });
    execFileSync(
      process.execPath,
      ["--import", loader, resolve("scripts/restore.ts"), bundle, restored],
      { stdio: "pipe" },
    );
    verifyBundle(restored);
    const db = new Database(join(restored, "editorial.sqlite"));
    db.prepare("DELETE FROM editions WHERE id=?").run(e.id);
    db.close();
    expect(() => verifyBundle(restored)).toThrow("Missing retained garden");
  } finally {
    editorial.db.close();
    progress.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
