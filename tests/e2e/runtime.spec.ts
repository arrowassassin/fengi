import { expect, test } from "@playwright/test";
import { createDeck } from "../../src/games/pairs/engine";

test("Phaser scenes remount, resize and keep semantic keyboard controls in reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const [index, game] of ["signal", "pairs", "trail", "odd", "orbit", "signal"].entries()) {
    await page.goto(`/play/${game}?mode=practice&seed=runtime-${index}`);
    const board = page.locator('[data-engine="phaser"]');
    await expect(board.locator("canvas")).toHaveCount(1);
    const before = await board
      .locator("canvas")
      .evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL());
    if (game === "signal") {
      await page.locator(".signal-tile:not([disabled])").first().focus();
      await page.keyboard.press("Enter");
      await expect(page.locator(".signal-tile:not([disabled])").first()).toHaveAttribute(
        "data-state",
        "1",
      );
      await expect
        .poll(() =>
          board.locator("canvas").evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL()),
        )
        .not.toBe(before);
    }
    await page.setViewportSize({ width: 375, height: 812 });
    await expect
      .poll(async () => {
        const bounds = await board.boundingBox();
        const width = await board.locator("canvas").getAttribute("width");
        return Math.abs(Number(width) - (bounds?.width ?? 0));
      })
      .toBeLessThan(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.getByRole("link", { name: "All games" }).click();
    await expect(page.locator("canvas")).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});

test("Pair mismatch resolves on the scene clock and can be replayed", async ({ page }) => {
  const deck = createDeck("scene-clock"),
    first = 0,
    second = deck.findIndex((value) => value !== deck[first]);
  await page.goto("/play/pairs?mode=practice&seed=scene-clock");
  await expect(page.locator('[data-engine="phaser"] canvas')).toHaveCount(1);
  await page.locator(`[data-card="${first}"]`).click();
  await page.locator(`[data-card="${second}"]`).click();
  await expect(page.locator(".pair-card.revealed")).toHaveCount(2);
  await expect(page.locator(".pair-card.revealed")).toHaveCount(0, { timeout: 3000 });
  await page.locator(`[data-card="${first}"]`).click();
  await expect(page.locator(".pair-card.revealed")).toHaveCount(1);
});

test("Orbit saves and pauses on visibility interruption without advancing on return", async ({
  page,
}) => {
  await page.goto("/play/orbit?mode=practice&seed=visibility&pace=calm");
  await expect(page.locator('[data-engine="phaser"] canvas')).toHaveCount(1);
  await page.getByRole("button", { name: "Start run", exact: true }).click();
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.getByRole("button", { name: "Resume", exact: true })).toBeVisible();
  const paused = await page.locator(".stat-line").textContent();
  await page.waitForTimeout(1100);
  await page.evaluate(() => {
    delete (document as unknown as { hidden?: boolean }).hidden;
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.locator(".stat-line")).toHaveText(paused ?? "");
  await page.reload();
  await expect(page.getByRole("button", { name: "Resume", exact: true })).toBeVisible();
  await expect(page.locator(".stat-line")).toHaveText(paused ?? "");
});
