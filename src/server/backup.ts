import { createHash } from "node:crypto";
import { join } from "node:path";
import Database from "better-sqlite3";
import { gardenState } from "../games/garden-state";
import type { GeneratedPack } from "../games/generated-content";
import { orbitDefinition, pairDefinition, signalDefinition } from "../games/generated-definitions";
import { sessionFromId } from "../games/registry";
import { validateDraft } from "./content-draft";
import { seedForCategories } from "./editorial";
import { DATABASE_VERSION } from "./store";
export function verifyBundle(directory: string) {
  const references: { id: string; state: unknown; game: string }[] = [];
  const packs = new Map<string, GeneratedPack>();
  const layouts = new Map<string, unknown>();
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
        for (const row of db.prepare("SELECT id,body FROM saves").all() as {
          id: string;
          body: string;
        }[]) {
          const session = sessionFromId(row.id);
          if (session && session.rulesVersion === 2) {
            if (session.mode !== "practice") throw new Error("Invalid garden session");
            const record = JSON.parse(row.body);
            if (record.id !== row.id) throw new Error("Mismatched saved identity");
            references.push({ id: session.seed, state: record.state, game: session.game });
          }
        }
        if ((db.pragma("foreign_key_check") as unknown[]).length)
          throw new Error("Broken snapshot references");
      }
      if (name === "editorial") {
        db.prepare("SELECT seq,edition,action,actor,digest,at FROM editorial_events").all();
        const rows = db
          .prepare("SELECT id,body,digest,state,reviewer,created FROM editions")
          .all() as { id: string; body: string; digest: string; state: string }[];
        for (const row of rows) {
          if (createHash("sha256").update(row.body).digest("hex") !== row.digest)
            throw new Error("Editorial digest mismatch");
          const data = JSON.parse(row.body);
          if (data.pack && ["published", "revoked"].includes(row.state))
            packs.set(row.id, data.pack);
          if (data.garden && ["published", "revoked"].includes(row.state))
            layouts.set(row.id, data.garden);
          validateDraft({
            title: data.title,
            description: data.description,
            categoryIds: data.categoryIds,
            ...(data.pack ? { pack: data.pack } : {}),
            ...(data.garden ? { garden: data.garden } : {}),
          });
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
  for (const ref of references) {
    if (["signal", "pairs", "orbit"].includes(ref.game)) {
      const pack = packs.get(ref.id);
      if (!pack) throw new Error("Missing retained game pack in paired snapshot");
      const d =
        ref.game === "signal"
          ? signalDefinition(pack.signal)
          : ref.game === "pairs"
            ? pairDefinition(pack.pairs)
            : orbitDefinition(pack.orbit);
      if (!d.validate({} as Parameters<typeof d.validate>[0], ref.state))
        throw new Error("Invalid paired game save");
      continue;
    }
    const layout = layouts.get(ref.id);
    if (!layout) throw new Error("Missing retained garden in paired snapshot");
    gardenState(layout as Parameters<typeof gardenState>[0], ref.state);
  }
}
