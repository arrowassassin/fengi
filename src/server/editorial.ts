import { createHash, randomUUID } from "node:crypto";
import { chmodSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import Database from "better-sqlite3";
import { dailyPrompts } from "../games/odd/engine";
import { type DraftResult, validateDraft } from "./content-draft";

export type Edition = {
  id: string;
  title: string;
  description: string;
  categoryIds: string[];
  garden?: DraftResult["garden"];
  seed: string;
  source: "nvidia" | "deterministic";
  model: string;
  rights: string;
  digest: string;
  state: "draft" | "approved" | "published" | "revoked";
  reviewer: string | null;
  created: number;
};
const digest = (body: string) => createHash("sha256").update(body).digest("hex");
function required(value: string, max = 240) {
  if (!value.trim() || value.length > max || [...value].some((c) => c.charCodeAt(0) < 32))
    throw new Error("A bounded, nonempty review field is required");
  return value.trim();
}
// A collection selects a reproducible v1 practice seed. Published selection never mutates v1.
export function seedForCategories(ids: string[]) {
  for (let i = 0; i < 20000; i++) {
    const seed = `collection-${i}`;
    if (
      dailyPrompts(seed)
        .map((c) => c.id)
        .join(",") === ids.join(",")
    )
      return seed;
  }
  throw new Error("No compatible edition seed found");
}
export class EditorialStore {
  readonly db: Database.Database;
  constructor(path: string) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    this.db = new Database(path, { timeout: 5000 });
    if (path !== ":memory:") chmodSync(path, 0o600);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("synchronous = FULL");
    this.db.exec(`CREATE TABLE IF NOT EXISTS editions (
      id TEXT PRIMARY KEY, body TEXT NOT NULL, digest TEXT NOT NULL,
      state TEXT NOT NULL, reviewer TEXT, created INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS editorial_events (
      seq INTEGER PRIMARY KEY, edition TEXT NOT NULL, action TEXT NOT NULL,
      actor TEXT NOT NULL, digest TEXT NOT NULL, at INTEGER NOT NULL);`);
  }
  create(result: DraftResult, model: string, rights: string) {
    const validated = validateDraft({
      title: result.title,
      description: result.description,
      categoryIds: result.categories.map((c) => c.id),
      ...(result.garden ? { garden: result.garden } : {}),
    });
    return this.db
      .transaction(() => {
        if (validated.garden) {
          for (const row of this.db.prepare("SELECT body FROM editions").all() as {
            body: string;
          }[]) {
            const prior = JSON.parse(row.body).garden;
            if (prior && JSON.stringify(prior) === JSON.stringify(validated.garden))
              throw new Error("Duplicate garden");
          }
        }
        const body = JSON.stringify({
          title: validated.title,
          description: validated.description,
          categoryIds: validated.categoryIds,
          ...(validated.garden ? { garden: validated.garden } : {}),
          seed: seedForCategories(validated.categoryIds),
          source: result.source,
          model: result.source === "nvidia" ? required(model) : "curated-v1",
          rights: required(rights),
        });
        const id = randomUUID();
        this.db
          .prepare("INSERT INTO editions VALUES(?,?,?,'draft',NULL,?)")
          .run(id, body, digest(body), Date.now());
        return this.get(id);
      })
      .immediate();
  }
  get(id: string): Edition | null {
    const row = this.db.prepare("SELECT * FROM editions WHERE id=?").get(id) as
      | {
          id: string;
          body: string;
          digest: string;
          state: Edition["state"];
          reviewer: string | null;
          created: number;
        }
      | undefined;
    if (!row) return null;
    if (digest(row.body) !== row.digest) throw new Error("Edition integrity failure");
    const data = JSON.parse(row.body);
    validateDraft({
      title: data.title,
      description: data.description,
      categoryIds: data.categoryIds,
      ...(data.garden ? { garden: data.garden } : {}),
    });
    if (
      data.seed !== seedForCategories(data.categoryIds) ||
      !["nvidia", "deterministic"].includes(data.source)
    )
      throw new Error("Invalid edition metadata");
    return {
      ...data,
      id: row.id,
      digest: row.digest,
      state: row.state,
      reviewer: row.reviewer,
      created: row.created,
    };
  }
  transition(
    id: string,
    expectedDigest: string,
    action: "approve" | "publish" | "revoke",
    actor: string,
  ) {
    required(actor, 120);
    return this.db
      .transaction(() => {
        const edition = this.get(id);
        if (!edition || edition.digest !== expectedDigest)
          throw new Error("Review digest mismatch");
        const from = { approve: "draft", publish: "approved", revoke: "published" }[action];
        const to = { approve: "approved", publish: "published", revoke: "revoked" }[action];
        if (edition.state !== from) throw new Error("Invalid editorial transition");
        this.db
          .prepare("UPDATE editions SET state=?,reviewer=? WHERE id=?")
          .run(to, action === "approve" ? actor : edition.reviewer, id);
        this.db
          .prepare("INSERT INTO editorial_events(edition,action,actor,digest,at) VALUES(?,?,?,?,?)")
          .run(id, action, actor, expectedDigest, Date.now());
        return this.get(id);
      })
      .immediate();
  }
  published() {
    const ids = this.db
      .prepare("SELECT id FROM editions WHERE state='published' ORDER BY created DESC LIMIT 24")
      .all() as { id: string }[];
    return ids.map(({ id }) => this.get(id)).filter((e): e is Edition => e !== null);
  }
}
export function editorialPath() {
  return process.env.FENGI_EDITORIAL_PATH || resolve(".data/editorial.sqlite");
}
// Public reads fail closed to curated gameplay; no drafts or review metadata leave the server.
export function publishedEditions() {
  let store: EditorialStore | undefined;
  try {
    store = new EditorialStore(editorialPath());
    return store.published();
  } catch {
    return [];
  } finally {
    store?.db.close();
  }
}
export function publicEdition(id: string) {
  let store: EditorialStore | undefined;
  try {
    store = new EditorialStore(editorialPath());
    const edition = store.get(id);
    return edition?.state === "published" ? edition : null;
  } catch {
    return null;
  } finally {
    store?.db.close();
  }
}

// Retained reviewed layouts remain available for existing versioned saves after revocation.
export function retainedGarden(id: string) {
  const store = new EditorialStore(editorialPath());
  try {
    const e = store.get(id);
    return e?.garden && ["published", "revoked"].includes(e.state) ? e : null;
  } finally {
    store.db.close();
  }
}
