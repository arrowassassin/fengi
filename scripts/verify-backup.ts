import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { verifyBundle } from "../src/server/backup";

if (!process.argv[2]) throw new Error("Provide a backup bundle directory");
const directory = resolve(process.argv[2]);
if (JSON.parse(readFileSync(join(directory, "complete.json"), "utf8")).version !== 1)
  throw new Error("Incomplete or unsupported backup");
verifyBundle(directory);
console.log("Both database snapshots, editorial digests and schemas verified.");
