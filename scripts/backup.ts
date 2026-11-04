import { chmod, mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { verifyBundle } from "../src/server/backup";
import { EditorialStore, editorialPath } from "../src/server/editorial";
import { getStore } from "../src/server/store";

const destination = resolve(process.argv[2] || `backups/fengi-${Date.now()}`);
// Exclusive directory creation: never overwrite an existing snapshot or source.
await mkdir(destination, { mode: 0o700 });
const store = getStore();
const editorial = new EditorialStore(editorialPath());
try {
  await store.db.backup(join(destination, "progress.sqlite"));
  await editorial.db.backup(join(destination, "editorial.sqlite"));
  for (const file of ["progress.sqlite", "editorial.sqlite"])
    await chmod(join(destination, file), 0o600);
  verifyBundle(destination);
  await writeFile(
    join(destination, "complete.json"),
    JSON.stringify({
      version: 1,
      completedAt: new Date().toISOString(),
      consistency: "individual-snapshots",
    }),
    { mode: 0o600, flag: "wx" },
  );
  console.log("Both database snapshots verified; backup complete.");
} finally {
  editorial.db.close();
  store.close();
}
