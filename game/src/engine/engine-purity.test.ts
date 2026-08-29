import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Spec §7d: engine/ is pure TypeScript — no UI, DOM, design, or browser-global
 * dependencies. This test is the automated boundary check CI relies on.
 */
const ENGINE_DIR = join(__dirname);
const FORBIDDEN_IMPORT = /from\s+["'](?:\.\.\/(?!engine)|[^."'][^"']*)["']/g;
const ALLOWED_BARE = new Set(["vitest", "fast-check", "node:fs", "node:path"]);
const FORBIDDEN_GLOBALS = /\b(?:document|window|localStorage|navigator|HTMLElement|fetch)\b/;

function engineSources(): { file: string; text: string }[] {
  return readdirSync(ENGINE_DIR)
    .filter((f) => f.endsWith(".ts"))
    .map((file) => ({ file, text: readFileSync(join(ENGINE_DIR, file), "utf8") }));
}

describe("engine purity (spec §7d)", () => {
  it("never imports outside engine/ except test tooling", () => {
    for (const { file, text } of engineSources()) {
      for (const match of text.matchAll(FORBIDDEN_IMPORT)) {
        const spec = match[0].replace(/from\s+["']/, "").replace(/["']$/, "");
        expect(ALLOWED_BARE.has(spec), `${file} imports "${spec}"`).toBe(true);
        if (!file.endsWith(".test.ts") && file !== "testUtils.ts") {
          expect.fail(`${file} (production engine code) imports "${spec}"`);
        }
      }
    }
  });

  it("production engine code never touches browser globals", () => {
    for (const { file, text } of engineSources()) {
      if (file.endsWith(".test.ts") || file === "testUtils.ts") continue;
      expect(FORBIDDEN_GLOBALS.test(text), `${file} touches a browser global`).toBe(false);
    }
  });
});
