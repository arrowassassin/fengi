import { expect, test } from "@playwright/test";
import { createDeck } from "../../src/games/pairs/v1/engine";
import { createPuzzle } from "../../src/games/signal/v1/engine";

test("daily shelf filters and shows a truthful local resume state", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".lobby-card")).toHaveCount(5);
  await page.getByRole("button", { name: "Remember", exact: true }).click();
  await expect(page.locator(".lobby-card")).toHaveCount(1);
  await expect(page.locator(".lobby-card h3")).toHaveText("Pair Bloom");
  await page.getByRole("button", { name: "All games", exact: true }).click();
  await page.getByRole("link", { name: "Signal Grid · Play", exact: true }).click();
  await page.locator(".signal-tile:not([disabled])").first().click();
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Signal Grid · Resume", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Resume game", exact: true })).toBeVisible();
});
test("Signal teaches its rule without modifying the edition", async ({ page }) => {
  await page.goto("/play/signal?mode=practice&seed=ux-rules");
  await page.locator(".signal-board").waitFor();
  const before = await page
    .locator("[data-cell]")
    .evaluateAll((els) => els.map((e) => e.getAttribute("data-state")));
  await page.getByText("How to play", { exact: true }).click();
  await page.getByRole("button", { name: /Example tile: blank/ }).click();
  await expect(page.locator(".signal-example [role=status]")).toContainText("2/2 circles ✓");
  expect(
    await page
      .locator("[data-cell]")
      .evaluateAll((els) => els.map((e) => e.getAttribute("data-state"))),
  ).toEqual(before);
  await expect(page.locator(".clue-legend")).toContainText("! too many circles");
});
test("Pair Bloom can hold a mismatch until dismissed and remembers the preference", async ({
  page,
}) => {
  const deck = createDeck("ux-memory"),
    first = 0,
    second = deck.findIndex((n) => n !== deck[first]);
  await page.goto("/play/pairs?mode=practice&seed=ux-memory");
  await page.getByRole("checkbox", { name: "Keep mismatches visible until I’m ready" }).check();
  await page.locator(`[data-card="${first}"]`).click();
  await page.locator(`[data-card="${second}"]`).click();
  await page.waitForTimeout(1200);
  await expect(page.locator(".pair-card.revealed")).toHaveCount(2);
  await page.getByRole("button", { name: "Hide cards and continue" }).click();
  await expect(page.locator(".pair-card.revealed")).toHaveCount(0);
  await expect(page.locator(".stat-line")).toContainText("1 turn");
  await page.reload();
  await expect(
    page.getByRole("checkbox", { name: "Keep mismatches visible until I’m ready" }),
  ).toBeChecked();
});
test("Orbit keyboard starts into reverse and renderer agrees on paused state", async ({ page }) => {
  await page.goto("/play/orbit?mode=practice&seed=ux-orbit");
  const scene = page.locator("[data-engine=phaser]");
  await expect(scene).toHaveAttribute("data-engine-caption", "READY WHEN YOU ARE");
  await page.getByRole("button", { name: "Start run", exact: true }).click();
  const reverse = page.getByRole("button", { name: "Reverse direction" });
  await expect(reverse).toBeFocused();
  await page.keyboard.press("Space");
  await expect(page.getByRole("status").filter({ hasText: "Direction:" })).toContainText(
    "counterclockwise",
  );
  await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(scene).toHaveAttribute("data-engine-caption", "PAUSED");
  await expect(page.locator(".orbit-caption")).toHaveText("PAUSED");
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect(reverse).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status").filter({ hasText: "Direction:" })).toContainText(
    "clockwise",
  );
});
test("small portrait keeps Orbit controls together and Odd rejection retains input", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto("/play/orbit?mode=practice&seed=ux-small");
  await page.locator("[data-engine=phaser]").waitFor();
  const arena = await page.locator(".orbit-stage").boundingBox(),
    controls = await page.locator(".orbit-controls").boundingBox();
  expect(arena).not.toBeNull();
  expect(controls).not.toBeNull();
  if (arena && controls) expect(controls.y - (arena.y + arena.height)).toBeLessThan(70);
  const startBox = await page.getByRole("button", { name: "Start run", exact: true }).boundingBox(),
    navBox = await page.getByRole("navigation", { name: "Main navigation" }).boundingBox();
  if (startBox && navBox) expect(startBox.y + startBox.height).toBeLessThanOrEqual(navBox.y);
  await page.goto("/play/odd?mode=practice&seed=ux-keyboard");
  await page.getByLabel("Your answer", { exact: true }).fill("not-an-edition-answer");
  // A resized viewport approximates constrained keyboard space; it is not a real-device keyboard test.
  await page.setViewportSize({ width: 360, height: 380 });
  await page.getByRole("button", { name: "Lock answer" }).click();
  await expect(page.getByLabel("Your answer", { exact: true })).toBeFocused();
  await expect(page.getByLabel("Your answer", { exact: true })).toHaveValue(
    "not-an-edition-answer",
  );
  await expect(page.getByLabel("Your answer", { exact: true })).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(page.getByRole("alert").filter({ hasText: "Not in this edition" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("daily shelf distinguishes a completed edition from a resumable game", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Signal Grid · Play", exact: true }).click();
  await expect(page).toHaveURL(/\/play\/signal\?/);
  const seed = new URL(page.url()).searchParams.get("date");
  if (!seed) throw new Error("Missing daily edition");
  const puzzle = createPuzzle(seed);
  for (let i = 0; i < 25; i++)
    if (puzzle.givens[i] === -1) {
      await page.locator(`[data-cell="${i}"]`).click();
      if (puzzle.solution[i] === 0) await page.locator(`[data-cell="${i}"]`).click();
    }
  await expect(page.getByRole("heading", { name: "Time well spent." })).toBeVisible();
  await page.goto("/");
  const card = page.getByRole("link", { name: "Signal Grid · View result", exact: true });
  await expect(card).toContainText("Completed");
  await expect(page.locator(".resume-strip")).toHaveCount(0);
});
