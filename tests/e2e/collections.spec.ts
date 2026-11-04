import { resolve } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { dailyPrompts } from "../../src/games/odd/engine";
import { draftContent } from "../../src/server/content-draft";
import { type Edition, EditorialStore } from "../../src/server/editorial";

let edition: Edition;
let store: EditorialStore;
test.beforeAll(async () => {
  store = new EditorialStore(resolve(".data/editorial-e2e.sqlite"));
  const result = await draftContent("browser-fixture", {});
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
