import { createHash, randomBytes, randomUUID } from "node:crypto";
import { chmodSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import Database from "better-sqlite3";
import type { SavedRecord } from "../lib/persistence";
export type StoredSave = { record: SavedRecord; revision: number; mutationId: string };
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const token = () => randomBytes(32).toString("base64url");
export class StoreError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export class ProgressStore {
  readonly db: Database.Database;
  constructor(path: string) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    this.db = new Database(path, { timeout: 5000 });
    if (path !== ":memory:") chmodSync(path, 0o600);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("synchronous = FULL");
    this.db.pragma("foreign_keys = ON");
    const version = this.db.pragma("user_version", { simple: true }) as number;
    if (version > 1) {
      this.db.close();
      throw new Error("Database schema is newer than this application");
    }
    this.db
      .transaction(() => {
        this.db.exec(`CREATE TABLE IF NOT EXISTS profiles (id TEXT PRIMARY KEY, recovery_hash TEXT UNIQUE, created INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS sessions (hash TEXT PRIMARY KEY, profile TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, expires INTEGER NOT NULL);
      CREATE INDEX IF NOT EXISTS session_profiles ON sessions(profile);
      CREATE TABLE IF NOT EXISTS saves (profile TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, id TEXT NOT NULL, revision INTEGER NOT NULL, mutation TEXT NOT NULL, body TEXT NOT NULL, updated INTEGER NOT NULL, PRIMARY KEY(profile,id));
      CREATE TABLE IF NOT EXISTS rate_limits (bucket TEXT PRIMARY KEY, start INTEGER NOT NULL, count INTEGER NOT NULL);
      PRAGMA user_version = 1;`);
      })
      .immediate();
  }
  limit(bucket: string, max: number) {
    this.db
      .transaction(() => {
        const now = Date.now();
        this.db.prepare("DELETE FROM rate_limits WHERE start < ?").run(now - 60000);
        const row = this.db.prepare("SELECT count FROM rate_limits WHERE bucket=?").get(bucket) as
          | { count: number }
          | undefined;
        if (row && row.count >= max)
          throw new StoreError(429, "Too many requests. Please try again in a minute.");
        this.db
          .prepare(
            "INSERT INTO rate_limits(bucket,start,count) VALUES(?,?,1) ON CONFLICT(bucket) DO UPDATE SET count=count+1",
          )
          .run(bucket, now);
      })
      .immediate();
  }
  identify(secret: string | undefined): string | null {
    if (!secret || !/^[\w-]{43}$/.test(secret)) return null;
    const row = this.db
      .prepare("SELECT profile FROM sessions WHERE hash=? AND expires>?")
      .get(hash(secret), Date.now()) as { profile: string } | undefined;
    return row?.profile ?? null;
  }
  private issue(profile: string) {
    const secret = token();
    this.db.prepare("DELETE FROM sessions WHERE expires < ?").run(Date.now());
    this.db
      .prepare("INSERT INTO sessions(hash,profile,expires) VALUES(?,?,?)")
      .run(hash(secret), profile, Date.now() + 180 * 86400000);
    this.db
      .prepare(
        "DELETE FROM sessions WHERE profile=? AND hash NOT IN (SELECT hash FROM sessions WHERE profile=? ORDER BY expires DESC LIMIT 10)",
      )
      .run(profile, profile);
    return secret;
  }
  create() {
    return this.db
      .transaction(() => {
        const { count } = this.db.prepare("SELECT count(*) AS count FROM profiles").get() as {
          count: number;
        };
        if (count >= 10000) throw new StoreError(503, "New profiles are temporarily unavailable.");
        const id = randomUUID();
        this.db.prepare("INSERT INTO profiles(id,created) VALUES(?,?)").run(id, Date.now());
        return this.issue(id);
      })
      .immediate();
  }
  recovery(profile: string) {
    const code = token();
    this.db.prepare("UPDATE profiles SET recovery_hash=? WHERE id=?").run(hash(code), profile);
    return code;
  }
  recover(code: string) {
    return this.db
      .transaction(() => {
        const row = this.db
          .prepare("SELECT id FROM profiles WHERE recovery_hash=?")
          .get(hash(code)) as { id: string } | undefined;
        if (!row) throw new StoreError(400, "Recovery code is invalid or already used.");
        this.db.prepare("UPDATE profiles SET recovery_hash=NULL WHERE id=?").run(row.id);
        return this.issue(row.id);
      })
      .immediate();
  }
  list(profile: string): StoredSave[] {
    const rows = this.db
      .prepare(
        "SELECT body,revision,mutation FROM saves WHERE profile=? ORDER BY updated DESC LIMIT 60",
      )
      .all(profile) as { body: string; revision: number; mutation: string }[];
    return rows.map((r) => ({
      record: JSON.parse(r.body),
      revision: r.revision,
      mutationId: r.mutation,
    }));
  }
  save(profile: string, record: SavedRecord, expected: number, mutation: string): StoredSave {
    return this.db
      .transaction(() => {
        const old = this.db
          .prepare("SELECT revision,mutation,body FROM saves WHERE profile=? AND id=?")
          .get(profile, record.id) as
          | { revision: number; mutation: string; body: string }
          | undefined;
        if (old?.mutation === mutation)
          return { record: JSON.parse(old.body), revision: old.revision, mutationId: mutation };
        if ((old?.revision ?? 0) !== expected)
          throw new StoreError(
            409,
            "Progress changed in another session. Load the saved copy before continuing.",
          );
        const revision = expected + 1;
        this.db
          .prepare(
            "INSERT INTO saves(profile,id,revision,mutation,body,updated) VALUES(?,?,?,?,?,?) ON CONFLICT(profile,id) DO UPDATE SET revision=excluded.revision,mutation=excluded.mutation,body=excluded.body,updated=excluded.updated",
          )
          .run(profile, record.id, revision, mutation, JSON.stringify(record), record.updated);
        this.db
          .prepare(
            "DELETE FROM saves WHERE profile=? AND id NOT IN (SELECT id FROM saves WHERE profile=? ORDER BY updated DESC LIMIT 60)",
          )
          .run(profile, profile);
        return { record, revision, mutationId: mutation };
      })
      .immediate();
  }
  delete(profile: string) {
    this.db.prepare("DELETE FROM profiles WHERE id=?").run(profile);
  }
  ready() {
    this.db.prepare("SELECT 1 FROM profiles LIMIT 1").get();
    return true;
  }
  close() {
    this.db.close();
  }
}
let singleton: ProgressStore | undefined;
export function getStore() {
  singleton ??= new ProgressStore(process.env.FENGI_DATABASE_PATH || resolve(".data/fengi.sqlite"));
  return singleton;
}
