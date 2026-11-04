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
