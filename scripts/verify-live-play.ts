import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { chromium, devices } from "@playwright/test";
import { generatedPuzzle } from "../src/games/generated-content";
import { dailyPrompts } from "../src/games/odd/engine";
import { shortestRoute } from "../src/games/trail/engine";
import { draftContent } from "../src/server/content-draft";
import { EditorialStore } from "../src/server/editorial";

// Explicit operator diagnostic: consumes quota. Temporary local-only test publication,
// simulated review transitions (not human approval), no external publication. Requested screenshots are local labeled deliverables.
const directory = await mkdtemp(join(tmpdir(), "fengi-live-play-"));
const store = new EditorialStore(join(directory, "editorial.sqlite"));
let server: ReturnType<typeof spawn> | undefined;
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
let stage = "generation";
try {
  const captureDir = resolve(process.env.FENGI_CAPTURE_DIR || "/workspace/fengi-live-ai-captures");
  await mkdir(captureDir, { recursive: true });
  const editions = [];
  for (let attempt = 1; attempt <= 2; attempt++) {
    const start = Date.now(),
      draft = await draftContent(`live-browser-${attempt}`, process.env, undefined, true, true);
    if (draft.source !== "nvidia" || draft.reason !== "generated") {
      console.log(
        JSON.stringify({
          source: draft.source,
          reason: draft.reason,
          diagnostics: draft.diagnostics,
          elapsedMs: Date.now() - start,
          stage: "generation",
        }),
      );
      if (attempt === 2) throw new Error("Live generation failed");
      continue;
    }
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
    break;
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
  for (const [index, edition] of [...editions, ...editions].entries()) {
    const context = await browser.newContext(
      index ? devices["iPhone 13"] : devices["Desktop Chrome"],
    );
    const page = await context.newPage();
    stage = index ? "mobile-odd" : "desktop-odd";
    await page.goto(`${origin}/collections/${edition.id}`);
    await page.getByRole("link", { name: "Play this collection" }).click();
    await page
      .getByRole("heading", { name: dailyPrompts(edition.seed)[0].prompt, exact: true })
      .waitFor();
    await page.screenshot({
      path: `${captureDir}/odd-${index ? "mobile" : "desktop"}-live-nvidia.png`,
      fullPage: true,
    });
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
    stage = index ? "mobile-trail" : "desktop-trail";
    if (!edition.garden) throw new Error("Missing generated garden");
    await page.goto(`${origin}/collections/${edition.id}/trail`);
    const route = shortestRoute(edition.garden.walls, edition.garden.seeds);
    if (!route) throw new Error("Unsolvable garden");
    await page.getByRole("button", { name: new RegExp(`^Cell ${route[1] + 1}(,|$)`) }).click();
    await page.reload();
    await page.getByRole("status").filter({ hasText: "1 moves" }).waitFor();
    await page.screenshot({
      path: `${captureDir}/trail-${index ? "mobile" : "desktop"}-live-nvidia.png`,
      fullPage: true,
    });
    for (const cell of route.slice(2))
      await page.getByRole("button", { name: new RegExp(`^Cell ${cell + 1}(,|$)`) }).click();
    await page.getByRole("status").filter({ hasText: "Garden complete!" }).waitFor();
    await page.reload();
    await page.getByRole("status").filter({ hasText: "Garden complete!" }).waitFor();
    console.log(
      JSON.stringify({
        restoredAfterReload: true,
        scenario: index ? "mobile-garden" : "desktop-garden",
        source: "nvidia",
        validated: true,
        completed: true,
        externalPublication: false,
      }),
    );
    if (!edition.pack) throw new Error("Missing generated pack");

    for (const game of ["signal", "pairs", "orbit"] as const) {
      stage = `${index ? "mobile" : "desktop"}-${game}`;
      await page.goto(`${origin}/play/${game}?collection=${edition.id}`);
      await page.locator('[data-engine="phaser"] canvas').waitFor();
      const capture = () =>
        page.screenshot({
          path: `${captureDir}/${game}-${index ? "mobile" : "desktop"}-live-nvidia.png`,
          fullPage: true,
        });
      if (game === "signal") {
        const p = generatedPuzzle(edition.pack.signal);
        let captured = false;
        for (let i = 0; i < 25; i++)
          if (p.givens[i] === -1) {
            const tile = page.locator(`[data-cell="${i}"]`);
            await tile.click();
            if (p.solution[i] === 0) await tile.click();
            if (!captured) {
              await capture();
              await page.reload();
              await page.locator('[data-engine="phaser"] canvas').waitFor();
              captured = true;
            }
          }
      } else if (game === "pairs") {
        for (let symbol = 0; symbol < 8; symbol++) {
          const positions = edition.pack.pairs.deck.flatMap((v, i) => (v === symbol ? [i] : []));
          for (const i of positions) await page.locator(`[data-card="${i}"]`).click();
          if (symbol === 0) await capture();
          if (symbol < 7) await page.waitForTimeout(950);
          if (symbol === 2) {
            await page.reload();
            await page.locator('[data-engine="phaser"] canvas').waitFor();
          }
        }
      } else {
        await page.getByRole("button", { name: "Start run", exact: true }).click();
        await page.getByRole("button", { name: "Reverse direction" }).click();
        await page.waitForTimeout(1200);
        await page.getByRole("button", { name: "Pause", exact: true }).click();
        await capture();
        await page.reload();
        await page.getByRole("button", { name: "Resume", exact: true }).click();
      }
      await page.getByRole("heading", { name: "Time well spent." }).waitFor({ timeout: 60000 });
      await page.reload();
      await page.getByRole("heading", { name: "Time well spent." }).waitFor();
      console.log(
        JSON.stringify({
          game,
          scenario: index ? "mobile" : "desktop",
          source: "nvidia",
          completed: true,
          restoredAfterReload: true,
          externalPublication: false,
        }),
      );
    }
    await context.close();
  }
} catch {
  console.log(JSON.stringify({ failedStage: stage }));
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
