import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { chromium, devices } from "@playwright/test";
import { dailyPrompts } from "../src/games/odd/v1/engine";
import { createDeck } from "../src/games/pairs/v1/engine";

// Explicit local UI review: deterministic editions, isolated data, no inference or remote publication.
const destination = resolve(process.argv[2] || ".data/ui-captures"),
  data = await mkdtemp(join(tmpdir(), "fengi-ui-review-"));
await mkdir(destination, { recursive: true });
let server: ReturnType<typeof spawn> | undefined,
  browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
try {
  const origin = "http://127.0.0.1:3188";
  server = spawn(process.execPath, ["scripts/start.mjs"], {
    stdio: "ignore",
    env: {
      ...process.env,
      PORT: "3188",
      FENGI_HOST: "127.0.0.1",
      FENGI_ORIGIN: "",
      FENGI_DATABASE_PATH: join(data, "progress.sqlite"),
      FENGI_EDITORIAL_PATH: join(data, "editorial.sqlite"),
    },
  });
  let ready = false;
  for (let n = 0; n < 60; n++) {
    try {
      ready = (await fetch(`${origin}/api/health`)).ok;
    } catch {
      /* Bounded startup. */
    }
    if (ready) break;
    await new Promise((r) => setTimeout(r, 250));
  }
  if (!ready) throw new Error("Startup");
  browser = await chromium.launch();
  for (const mobile of [false, true]) {
    const context = await browser.newContext(
        mobile
          ? { ...devices["iPhone 13"], deviceScaleFactor: 1 }
          : { viewport: { width: 1440, height: 1000 } },
      ),
      page = await context.newPage(),
      name = mobile ? "mobile" : "desktop";
    const capture = async (label: string, fullPage = !mobile) => {
      await page.evaluate(() => document.fonts.ready);
      await page.mouse.move(0, 0);
      await page.screenshot({ path: join(destination, `${label}-${name}.png`), fullPage });
    };
    await page.goto(origin);
    await page.getByRole("heading", { name: "A small break. A good kind of challenge." }).waitFor();
    await capture("home-light");
    await page.getByRole("button", { name: "Use dark theme" }).click();
    await capture("home-dark");
    await page.getByRole("button", { name: "Use light theme" }).click();
    for (const game of ["signal", "pairs", "trail", "odd", "orbit"] as const) {
      const seed = "design-review";
      await page.goto(`${origin}/play/${game}?mode=practice&seed=${seed}`);
      await page.locator('[data-engine="phaser"] canvas').waitFor();
      if (game === "signal") await page.locator(".signal-tile:not([disabled])").first().click();
      if (game === "pairs") {
        const deck = createDeck(seed),
          other = deck.findIndex((v) => v !== deck[0]);
        await page
          .getByRole("checkbox", { name: "Keep mismatches visible until I’m ready" })
          .check();
        await page.locator('[data-card="0"]').click();
        await page.locator(`[data-card="${other}"]`).click();
        await page.getByRole("button", { name: "Hide cards and continue" }).waitFor();
      }
      if (game === "trail")
        await page.locator('[data-garden-cell][data-legal="true"]').first().click();
      if (game === "odd") {
        await page
          .getByLabel("Your answer", { exact: true })
          .fill(dailyPrompts(seed)[0].answers[0].word);
        await page.getByRole("button", { name: "Lock answer" }).click();
        await page
          .getByRole("heading", { name: dailyPrompts(seed)[1].prompt, exact: true })
          .waitFor();
      }
      if (game === "orbit") {
        await page.getByRole("button", { name: "Start run", exact: true }).click();
        await page.getByRole("button", { name: "Reverse direction" }).click();
        await page.waitForTimeout(600);
        await page.getByRole("button", { name: "Pause", exact: true }).click();
        await page.waitForFunction(
          () =>
            document
              .querySelector('[data-engine="phaser"]')
              ?.getAttribute("data-engine-caption") === "PAUSED",
        );
      }
      if (mobile) {
        const board = page.locator(game === "odd" ? ".word-panel" : ".board-area");
        await board.evaluate((el) =>
          window.scrollTo({
            top: el.getBoundingClientRect().top + window.scrollY - 12,
            behavior: "instant",
          }),
        );
      }
      await capture(`${game}-in-play`);
      if (game === "signal" && !mobile) {
        await page.getByText("How to play", { exact: true }).click();
        await page.getByRole("button", { name: /Example tile: blank/ }).click();
        await capture("signal-rule-example");
      }
      if (game === "odd" && mobile) {
        await page.setViewportSize({ width: 360, height: 380 });
        await page.getByLabel("Your answer", { exact: true }).fill("not-an-edition-answer");
        await page.getByRole("button", { name: "Lock answer" }).click();
        await capture("odd-constrained-input");
        await page.setViewportSize({ width: 390, height: 844 });
      }
    }
    for (const route of ["practice", "archive", "collections", "progress"]) {
      await page.goto(`${origin}/${route}`);
      await page.locator(".loading").waitFor({ state: "hidden" });
      await capture(route);
    }
    await context.close();
  }
  await writeFile(
    join(destination, "README.txt"),
    "Actual Fengi browser captures, not mockups. Deterministic practice editions and temporary anonymous profiles; no NVIDIA request or external publication. Desktop and iPhone-sized Chromium emulation, not real-device or software-keyboard validation. In-play mobile captures are scrolled to the board. Odd constrained input approximates reduced viewport space. Signal example is a separate tutorial. Pair mismatch is manually held; Orbit is paused with matching canvas/semantic feedback. Temporary databases are removed. These images and scripted checks do not establish independent human fun, usability or production readiness.\n",
  );
  console.log(
    "Actual desktop/mobile UI captures completed; deterministic content, no remote publication.",
  );
} catch {
  console.error("UI capture failed; no provider, credential or response details are logged.");
  process.exitCode = 1;
} finally {
  await browser?.close();
  if (server && server.exitCode === null) {
    server.kill("SIGTERM");
    await new Promise<void>((r) => {
      server?.once("exit", () => r());
      setTimeout(r, 5000).unref();
    });
  }
  await rm(data, { recursive: true, force: true });
}
