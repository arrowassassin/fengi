import { resolve } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { generatedPuzzle } from "../../src/games/generated-content";
import { dailyPrompts } from "../../src/games/odd/engine";
import { createDeck } from "../../src/games/pairs/v1/engine";
import { createPuzzle } from "../../src/games/signal/v1/engine";
import { createGarden, shortestRoute } from "../../src/games/trail/engine";
import { draftContent } from "../../src/server/content-draft";
import { type Edition, EditorialStore } from "../../src/server/editorial";

let edition: Edition;
let store: EditorialStore;
test.beforeAll(async () => {
  store = new EditorialStore(resolve(".data/editorial-e2e.sqlite"));
  const result = await draftContent("browser-fixture", {});
  const fixture = createGarden(`fixture-${Date.now()}-${Math.random()}`);
  result.garden = { walls: fixture.walls, seeds: fixture.seeds };
  const contentSeed = `fixture-${Date.now()}-${Math.random()}`,
    logic = createPuzzle(contentSeed);
  result.pack = {
    signal: {
      solution: logic.solution as (0 | 1)[],
      clues: logic.givens.flatMap((v, i) => (v === -1 ? [] : [i])),
    },
    pairs: { deck: createDeck(contentSeed) },
    orbit: {
      targets: [0.5, 1.8, 3.6, 5.1].map((angle) => angle + Math.random() * 0.05),
      phases: [Math.floor(Math.random() * 50), 70, 140],
      speed: 1.5,
    },
  };
  const created = store.create(result, "", "Original deterministic test fixture; no inference");
  if (!created) throw new Error("Missing fixture");
  edition = created;
  store.transition(edition.id, edition.digest, "approve", "test-reviewer");
  store.transition(edition.id, edition.digest, "publish", "test-publisher");
});
test.afterAll(() => {
  if (edition) store.transition(edition.id, edition.digest, "revoke", "test-cleanup");
  store.db.close();
});
test("published collection reaches its exact playable categories, saves and restores", async ({
  page,
}) => {
  await page.goto(`/collections/${edition.id}`);
  await expect(page.getByRole("heading", { name: edition.title })).toBeVisible();
  await expect(page.getByText("Curated · human reviewed")).toBeVisible();
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze())
      .violations,
  ).toEqual([]);
  await page.getByRole("link", { name: "Play this collection" }).click();
  for (const category of dailyPrompts(edition.seed)) {
    await expect(page.getByRole("heading", { name: category.prompt })).toBeVisible();
    await page.getByLabel("Your answer", { exact: true }).fill(category.answers[0].word);
    await page.getByLabel("Your answer", { exact: true }).press("Enter");
  }
  await expect(page.getByRole("heading", { name: "Time well spent." })).toBeVisible();
  await page.reload();
  await expect(page.locator(".answer-review details")).toHaveCount(3);
  await page.goto("/collections/not-published");
  await expect(page.getByRole("heading", { name: "A little off the path." })).toBeVisible();
});
test("play club identity is responsive, keyboard reachable and visually stable", async ({
  page,
}) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.mouse.move(0, 0);
  await expect(page.locator(".club-welcome")).toHaveScreenshot("play-club-welcome.png", {
    animations: "disabled",
    // Permit minor platform font rasterization differences, not layout changes.
    maxDiffPixelRatio: 0.001,
  });
  await page.mouse.move(0, 0);
  const shelfStyle = await page.addStyleTag({
    content: ".header-inner nav { visibility: hidden; }",
  });
  await expect(page.locator(".lobby-grid")).toHaveScreenshot("play-club-shelf.png", {
    animations: "disabled",
    maxDiffPixelRatio: 0.001,
  });
  await page.getByRole("button", { name: "Use dark theme" }).click();
  await page.mouse.move(0, 0);
  await expect(page.locator(".club-welcome")).toHaveScreenshot("play-club-welcome-dark.png", {
    animations: "disabled",
    maxDiffPixelRatio: 0.001,
  });
  await page.mouse.move(0, 0);
  await expect(page.locator(".lobby-grid")).toHaveScreenshot("play-club-shelf-dark.png", {
    animations: "disabled",
    maxDiffPixelRatio: 0.001,
  });
  await shelfStyle.evaluate((el) => el.parentNode?.removeChild(el));
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze())
      .violations,
  ).toEqual([]);
});

test("approved generated garden is playable and keyboard accessible", async ({ page, context }) => {
  await page.goto(`/collections/${edition.id}/trail`);
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze()).violations,
  ).toEqual([]);
  const garden = edition.garden;
  if (!garden) throw new Error("Missing garden");
  const route = shortestRoute(garden.walls, garden.seeds);
  if (!route) throw new Error("Missing route");
  await page.getByRole("button", { name: new RegExp(`^Cell ${route[1] + 1}(,|$)`) }).click();
  await page.reload();
  await expect(page.getByRole("status")).toContainText("1 moves");
  const other = await context.newPage();
  await other.goto(`/collections/${edition.id}/trail`);
  await expect(
    other.getByRole("heading", { name: "This game is open in another tab." }),
  ).toBeVisible();
  await other.close();
  await context.setOffline(true);
  await page.getByRole("button", { name: new RegExp(`^Cell ${route[2] + 1}(,|$)`) }).click();
  await expect(page.getByRole("status")).toContainText("2 moves");
  await context.setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect
    .poll(async () =>
      page.evaluate(() =>
        Object.keys(localStorage)
          .filter((k) => k.startsWith("fengi:save:trail:v2:"))
          .map((k) => JSON.parse(localStorage.getItem(k) || "{}"))
          .every((r) => r.pending === false),
      ),
    )
    .toBe(true);
  await page.reload();
  await expect(page.getByRole("status")).toContainText("2 moves");
  await page.evaluate(() => {
    for (const key of Object.keys(localStorage))
      if (key.startsWith("fengi:save:trail:v2:")) localStorage.removeItem(key);
  });
  await page.reload();
  await expect(page.getByRole("status")).toContainText("2 moves");
  for (const cell of route.slice(3))
    await page.getByRole("button", { name: new RegExp(`^Cell ${cell + 1}(,|$)`) }).click();
  await expect(page.getByRole("status")).toContainText("Garden complete!");
  await page.reload();
  await expect(page.getByRole("status")).toContainText("Garden complete!");
  await page.getByRole("button", { name: "Restart garden" }).click();
  await expect(page.getByRole("status")).toContainText("0/3 seeds");
});

for (const game of ["signal", "pairs", "orbit"] as const)
  test(`reviewed generated ${game} completes and restores`, async ({ page }) => {
    test.setTimeout(75000);
    const p = edition.pack;
    if (!p) throw new Error("Missing pack");
    await page.goto(`/play/${game}?collection=${edition.id}`);
    await expect(page.locator('[data-engine="phaser"] canvas')).toHaveCount(1);
    if (game === "signal") {
      const puzzle = generatedPuzzle(p.signal);
      let resumed = false;
      for (let i = 0; i < 25; i++)
        if (puzzle.givens[i] === -1) {
          await page.locator(`[data-cell="${i}"]`).click();
          if (puzzle.solution[i] === 0) await page.locator(`[data-cell="${i}"]`).click();
          if (!resumed) {
            await page.reload();
            await expect(page.locator(`[data-cell="${i}"]`)).toHaveAttribute(
              "data-state",
              String(puzzle.solution[i]),
            );
            resumed = true;
          }
        }
    }
    if (game === "pairs")
      for (let symbol = 0; symbol < 8; symbol++) {
        for (const i of p.pairs.deck.flatMap((v, i) => (v === symbol ? [i] : [])))
          await page.locator(`[data-card="${i}"]`).click();
        if (symbol < 7) await page.waitForTimeout(950);
        if (symbol === 1) {
          await page.reload();
          await expect(page.locator(".pair-card.paired")).toHaveCount(4);
        }
      }
    if (game === "orbit") {
      await page.getByRole("button", { name: "Start run", exact: true }).click();
      await page.getByRole("button", { name: "Reverse direction" }).click();
      await page.waitForTimeout(1100);
      await page.getByRole("button", { name: "Pause", exact: true }).click();
      await page.reload();
      await page.getByRole("button", { name: "Resume", exact: true }).click();
    }
    await expect(page.getByRole("heading", { name: "Time well spent." })).toBeVisible({
      timeout: 60000,
    });
    await page.reload();
    await expect(page.getByRole("heading", { name: "Time well spent." })).toBeVisible();
  });

test("generated Orbit calm moves slower, saves separately and resumes paused", async ({ page }) => {
  const pack = edition.pack;
  if (!pack) throw new Error("Missing pack");
  for (const calm of [false, true]) {
    await page.goto(`/play/orbit?collection=${edition.id}${calm ? "&pace=calm" : ""}`);
    await expect(
      page.getByText(calm ? "Calm practice · slower movement" : "Standard pace", { exact: false }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Start run", exact: true }).click();
    const key = `fengi:save:orbit:v2:practice:${edition.id}:${calm ? "calm" : "standard"}`;
    await expect
      .poll(() =>
        page.evaluate((key) => JSON.parse(localStorage.getItem(key) || "{}").state?.tick ?? 0, key),
      )
      .toBeGreaterThan(20);
    await page.getByRole("button", { name: "Pause", exact: true }).click();
    await expect
      .poll(() =>
        page.evaluate((key) => JSON.parse(localStorage.getItem(key) || "{}").pending, key),
      )
      .toBe(false);
    const rate = await page.evaluate((key) => {
      const s = JSON.parse(localStorage.getItem(key) || "{}").state;
      return s.angle / (s.tick / 60);
    }, key);
    expect(rate).toBeCloseTo(pack.orbit.speed * (calm ? 1.3 / 2.05 : 1), 5);
    await page.reload();
    await expect(page.getByRole("button", { name: "Resume", exact: true })).toBeVisible();
  }
});
