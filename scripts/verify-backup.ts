import { resolve } from "node:path";
import Database from "better-sqlite3";

if (!process.argv[2]) throw new Error("Usage: npm run db:verify -- /path/to/backup.sqlite");
const db = new Database(resolve(process.argv[2]), { readonly: true, fileMustExist: true });
try {
  const result = db.pragma("integrity_check", { simple: true });
  if (result !== "ok") throw new Error("Backup integrity check failed");
  if (db.pragma("user_version", { simple: true }) !== 1) throw new Error("Unsupported schema");
  console.log("Backup integrity and schema verified.");
} finally {
  db.close();
}
