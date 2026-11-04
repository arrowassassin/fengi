import { mkdir, writeFile } from "node:fs/promises";
import { draftContent } from "../src/server/content-draft";

const seed = new Date().toISOString().slice(0, 10);
const draft = await draftContent(seed);
await mkdir("content-drafts", { recursive: true });
const filename = `content-drafts/${seed}-${Date.now()}.json`;
await writeFile(filename, JSON.stringify(draft, null, 2), { mode: 0o600, flag: "wx" });
console.log(
  `Saved ${draft.source} draft (${draft.reason}) to ${filename}. Human review and production rights are required before publication.`,
);
