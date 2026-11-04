import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { expect, it } from "vitest";
import { EditorialStore } from "../../src/server/editorial";

it("two operator processes cannot insert the same canonical garden", async () => {
  const dir = mkdtempSync(join(tmpdir(), "editorial-race-")),
    path = join(dir, "editorial.sqlite");
  const store = new EditorialStore(path);
  store.db.close();
  const code = `import {EditorialStore} from ${JSON.stringify(pathToFileURL(resolve("src/server/editorial.ts")).href)}; import {draftContent} from ${JSON.stringify(pathToFileURL(resolve("src/server/content-draft.ts")).href)};const d=await draftContent("fixture",{});d.garden={walls:[10,9,8,7],seeds:[28,6,18]};const s=new EditorialStore(${JSON.stringify(path)});try{s.create(d,"","test rights");console.log("created");}catch(e){if(e.message!=="Duplicate garden")process.exitCode=1;else console.log("duplicate");}finally{s.db.close();}`;
  const run = () =>
    new Promise<string>((resolveRun, reject) => {
      const p = spawn(
        process.execPath,
        [
          "--import",
          resolve("node_modules/tsx/dist/loader.mjs"),
          "--input-type=module",
          "-e",
          code,
        ],
        { stdio: ["ignore", "pipe", "pipe"] },
      );
      let output = "";
      p.stdout.on("data", (b) => {
        output += b;
      });
      p.on("error", reject);
      p.on("exit", (status) =>
        status === 0 ? resolveRun(output.trim()) : reject(new Error("Operator subprocess failed")),
      );
    });
  try {
    expect((await Promise.all([run(), run()])).sort()).toEqual(["created", "duplicate"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}, 15000);
