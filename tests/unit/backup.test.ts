import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
