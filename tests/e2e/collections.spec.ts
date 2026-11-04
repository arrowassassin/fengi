import { resolve } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { dailyPrompts } from "../../src/games/odd/engine";
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
  const created = store.create(result, "", "Original deterministic test fixture; no inference");
  if (!created) throw new Error("Missing fixture");
  edition = created;
  store.transition(edition.id, edition.digest, "approve", "test-reviewer");
  store.transition(edition.id, edition.digest, "publish", "test-publisher");
});
test.afterAll(() => {
  store.transition(edition.id, edition.digest, "revoke", "test-cleanup");
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
test("mushroom identity is responsive, keyboard reachable and visually stable", async ({
  page,
}) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await expect(page.locator(".collection-promo")).toHaveScreenshot("mushroom-collection.png", {
    animations: "disabled",
    // Permit minor platform font rasterization differences, not layout changes.
    maxDiffPixelRatio: 0.001,
  });
  await page.getByRole("button", { name: "Use dark theme" }).click();
  await expect(page.locator(".collection-promo")).toHaveScreenshot("mushroom-collection-dark.png", {
    animations: "disabled",
    maxDiffPixelRatio: 0.001,
  });
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
