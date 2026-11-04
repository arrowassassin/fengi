import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, devices } from "@playwright/test";
import { dailyPrompts } from "../src/games/odd/engine";
import { draftContent } from "../src/server/content-draft";
import { EditorialStore } from "../src/server/editorial";

// Explicit operator diagnostic: consumes quota. Temporary local-only test publication,
// simulated review transitions (not human approval), no external publication or screenshots.
const directory = await mkdtemp(join(tmpdir(), "fengi-live-play-"));
const store = new EditorialStore(join(directory, "editorial.sqlite"));
let server: ReturnType<typeof spawn> | undefined;
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
try {
  const editions = [];
  for (let attempt = 1; attempt <= 2; attempt++) {
    const start = Date.now(),
      draft = await draftContent(`live-browser-${attempt}`);
    if (draft.source !== "nvidia" || draft.reason !== "generated")
      throw new Error("Live generation failed");
    const edition = store.create(
      draft,
      process.env.NVIDIA_MODEL || "",
      "Authorized local verification only; not approved for external publication",
    );
    if (!edition) throw new Error("Missing test edition");
    store.transition(
      edition.id,
      edition.digest,
      "approve",
      "automated-local-test-not-human-review",
    );
    store.transition(edition.id, edition.digest, "publish", "automated-local-test-only");
    editions.push(edition);
    console.log(
      JSON.stringify({
        attempt,
        source: draft.source,
        validated: true,
        elapsedMs: Date.now() - start,
        externalPublication: false,
      }),
    );
  }
  const origin = "http://127.0.0.1:3187";
  server = spawn(process.execPath, ["scripts/start.mjs"], {
    stdio: "ignore",
    env: {
      ...process.env,
      PORT: "3187",
      FENGI_HOST: "127.0.0.1",
      FENGI_ORIGIN: "",
      FENGI_DATABASE_PATH: join(directory, "progress.sqlite"),
      FENGI_EDITORIAL_PATH: join(directory, "editorial.sqlite"),
    },
  });
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try {
      ready = (await fetch(`${origin}/api/health`)).ok;
    } catch {
      /* bounded startup poll */
    }
    if (ready) break;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  if (!ready || server.exitCode !== null) throw new Error("Local server unavailable");
  browser = await chromium.launch({ headless: true });
  for (const [index, edition] of editions.entries()) {
    const context = await browser.newContext(
      index ? devices["iPhone 13"] : devices["Desktop Chrome"],
    );
    const page = await context.newPage();
    await page.goto(`${origin}/collections/${edition.id}`);
    await page.getByRole("link", { name: "Play this collection" }).click();
    for (const category of dailyPrompts(edition.seed)) {
      await page.getByRole("heading", { name: category.prompt, exact: true }).waitFor();
      await page.getByLabel("Your answer", { exact: true }).fill(category.answers[0].word);
      await page.getByLabel("Your answer", { exact: true }).press("Enter");
    }
    await page.getByRole("heading", { name: "Time well spent." }).waitFor();
    await page.reload();
    await page.locator(".answer-review details").last().waitFor();
    if ((await page.locator(".answer-review details").count()) !== 3)
      throw new Error("Incomplete restoration");
    console.log(
      JSON.stringify({
        scenario: index ? "mobile" : "desktop",
        source: "nvidia",
        roundsCompleted: 3,
        restoredAfterReload: true,
        externalPublication: false,
      }),
    );
    await context.close();
  }
} catch {
  console.error(
    "Live browser verification failed; no provider, credential or generated-content details are logged.",
  );
  process.exitCode = 1;
} finally {
  await browser?.close();
  if (server && server.exitCode === null) {
    server.kill("SIGTERM");
    await new Promise<void>((resolve) => {
      server?.once("exit", () => resolve());
      setTimeout(resolve, 5000).unref();
    });
  }
  store.db.close();
  await rm(directory, { recursive: true, force: true });
}
