import { chmod, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { getStore } from "../src/server/store";

const destination = resolve(
  process.argv[2] || `backups/fengi-${new Date().toISOString().replace(/[:.]/g, "-")}.sqlite`,
);
await mkdir(dirname(destination), { recursive: true, mode: 0o700 });
const store = getStore();
try {
  await store.db.backup(destination);
  await chmod(destination, 0o600);
  console.log(`Backup completed: ${destination}`);
} finally {
  store.close();
}
