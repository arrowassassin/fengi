import { cp, mkdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { verifyBundle } from "../src/server/backup";

if (!process.argv[2] || !process.argv[3])
  throw new Error("Usage: db:restore -- BUNDLE NEW_DIRECTORY");
const source = resolve(process.argv[2]),
  destination = resolve(process.argv[3]);
if (JSON.parse(await readFile(join(source, "complete.json"), "utf8")).version !== 1)
  throw new Error("Incomplete backup");
verifyBundle(source);
await mkdir(destination, { mode: 0o700 });
for (const file of ["progress.sqlite", "editorial.sqlite"])
  await cp(join(source, file), join(destination, file), { errorOnExist: true, force: false });
verifyBundle(destination);
console.log(
  "Restored both databases into a new directory. Stop all writers before switching both runtime paths to these files.",
);
