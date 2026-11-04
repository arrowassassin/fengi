import { createHash } from "node:crypto";
import { join } from "node:path";
import Database from "better-sqlite3";
import { validateDraft } from "./content-draft";
import { seedForCategories } from "./editorial";
import { DATABASE_VERSION } from "./store";
export function verifyBundle(directory: string) {
  for (const name of ["progress", "editorial"]) {
    const db = new Database(join(directory, `${name}.sqlite`), {
      readonly: true,
      fileMustExist: true,
    });
    try {
      if (db.pragma("integrity_check", { simple: true }) !== "ok")
        throw new Error("Snapshot integrity failure");
      if (
        db.pragma("user_version", { simple: true }) !== (name === "progress" ? DATABASE_VERSION : 0)
      )
        throw new Error("Unsupported snapshot schema");
      if (name === "progress") {
        for (const table of ["profiles", "sessions", "saves", "rate_limits", "settings"])
          db.prepare(`SELECT * FROM ${table} LIMIT 0`).all();
        if ((db.pragma("foreign_key_check") as unknown[]).length)
          throw new Error("Broken snapshot references");
      }
      if (name === "editorial") {
        db.prepare("SELECT seq,edition,action,actor,digest,at FROM editorial_events").all();
        const rows = db
          .prepare("SELECT id,body,digest,state,reviewer,created FROM editions")
          .all() as { body: string; digest: string; state: string }[];
        for (const row of rows) {
          if (createHash("sha256").update(row.body).digest("hex") !== row.digest)
            throw new Error("Editorial digest mismatch");
          const data = JSON.parse(row.body);
          validateDraft(data);
          if (
            data.seed !== seedForCategories(data.categoryIds) ||
            !["nvidia", "deterministic"].includes(data.source) ||
            !["draft", "approved", "published", "revoked"].includes(row.state)
          )
            throw new Error("Invalid editorial metadata");
        }
      }
    } finally {
      db.close();
    }
  }
}
