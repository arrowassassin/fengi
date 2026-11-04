import { expect, test } from "@playwright/test";
import { dailyPrompts } from "../../src/games/odd/engine";
import { createDeck } from "../../src/games/pairs/engine";
import { createPuzzle } from "../../src/games/signal/engine";
import { createGarden, shortestRoute } from "../../src/games/trail/engine";

const seed = "browser-proof";
test("home, all five games, navigation, themes and responsive layout", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Small games. Big little victories." }),
  ).toBeVisible();
  await expect(page.locator(".game-card")).toHaveCount(4);
  await page.getByRole("button", { name: "Use dark theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("link", { name: "Practice", exact: true }).click();
  await expect(page.locator(".practice-card")).toHaveCount(5);
  await page.getByRole("link", { name: "Archive", exact: true }).click();
  await expect(page.locator(".archive-day")).toHaveCount(7);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test("Signal Grid keyboard input, undo, interruption and real completion", async ({ page }) => {
  await page.goto(`/play/signal?mode=practice&seed=${seed}`);
  await expect(page.locator('[data-engine="phaser"] canvas')).toHaveCount(1);
  const puzzle = createPuzzle(seed),
    editable = page.locator(".signal-tile:not([disabled])");
  await expect(editable.first()).toBeVisible();
  await editable.first().focus();
  await page.keyboard.press("Enter");
  await expect(editable.first()).toHaveAttribute("data-state", "1");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(editable.first()).toHaveAttribute("data-state", "-1");
  await editable.first().click();
  await page.reload();
  await expect(editable.first()).toHaveAttribute("data-state", "1");
  for (let i = 0; i < 25; i++) {
    if (puzzle.givens[i] !== -1) continue;
    const tile = page.locator(`[data-cell="${i}"]`);
    const order = [-1, 1, 0];
    const current = Number(await tile.getAttribute("data-state"));
    const clicks = (order.indexOf(puzzle.solution[i]) - order.indexOf(current) + 3) % 3;
    for (let attempt = 0; attempt < clicks; attempt++) await tile.click();
  }
  await expect(page.getByRole("heading", { name: "Time well spent." })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Time well spent." })).toBeVisible();
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: () => Promise.reject(new Error("unavailable")) },
      configurable: true,
    }),
  );
  await page.getByRole("button", { name: "Share result" }).click();
  await expect(page.getByLabel("Copy your result")).toHaveValue(/Fengi · Signal Grid/);
  await page.getByRole("link", { name: "Your progress", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Signal Grid" })).toBeVisible();
  await page.getByRole("link", { name: "View result" }).click();
  await expect(page.getByRole("heading", { name: "Time well spent." })).toBeVisible();
  await page.getByRole("button", { name: "Another round" }).click();
  await expect(page.locator(".signal-board")).toBeVisible();
  expect(page.url()).not.toContain(seed);
});
test("Odd Answer rejects unknown input, accepts canonical answers, persists results", async ({
  page,
}) => {
  await page.goto(`/play/odd?mode=practice&seed=${seed}`);
  await expect(page.locator('[data-engine="phaser"] canvas')).toHaveCount(1);
  await page.getByLabel("Your answer", { exact: true }).fill("not an answer");
  await page.getByRole("button", { name: "Lock answer" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Not in this edition" })).toContainText(
    "Not in this edition",
  );
  for (const prompt of dailyPrompts(seed)) {
    await page.getByLabel("Your answer", { exact: true }).fill(prompt.answers[0].word);
    await page.getByRole("button", { name: "Lock answer" }).click();
  }
  await expect(page.getByRole("heading", { name: "Time well spent." })).toBeVisible();
  await page.reload();
  await expect(page.locator(".answer-review details")).toHaveCount(3);
});
test("Trail Trace follows a solver-verified route through all seeds", async ({ page }) => {
  await page.goto(`/play/trail?mode=practice&seed=${seed}`);
  await expect(page.locator('[data-engine="phaser"] canvas')).toHaveCount(1);
  const garden = createGarden(seed),
    route = shortestRoute(garden.walls, garden.seeds);
  if (!route) throw new Error("missing route");
  await expect(page.locator(".trail-board")).toBeVisible();
  await page.locator(`[data-garden-cell="${route[1]}"]`).click();
  await page.reload();
  await expect(page.locator(`[data-garden-cell="${route[1]}"]`)).toHaveClass(/player/);
  for (const cell of route.slice(2)) await page.locator(`[data-garden-cell="${cell}"]`).click();
  await expect(page.getByText("Perfect route. Every step counted.")).toBeVisible();
});
test("Pair Bloom completes all eight pairs and survives reload", async ({ page }) => {
  await page.goto(`/play/pairs?mode=practice&seed=${seed}`);
  await expect(page.locator('[data-engine="phaser"] canvas')).toHaveCount(1);
  const deck = createDeck(seed);
  for (let symbol = 0; symbol < 8; symbol++) {
    const pair = deck.flatMap((v, i) => (v === symbol ? [i] : []));
    await page.locator(`[data-card="${pair[0]}"]`).click();
    await page.locator(`[data-card="${pair[1]}"]`).click();
    if (symbol < 7) {
      await expect(page.locator(`[data-card="${pair[0]}"]`)).toBeDisabled();
      await page.waitForTimeout(950);
    }
    if (symbol === 2) {
      await page.reload();
      await expect(page.locator(".pair-card.paired")).toHaveCount(6);
    }
  }
  await expect(page.getByText("8 turns · all 8 pairs found")).toBeVisible();
});
test("Orbit runs, reverses, pauses, reloads paused, then reaches a real terminal state", async ({
  page,
}) => {
  test.setTimeout(65000);
  await page.goto(`/play/orbit?mode=practice&seed=${seed}`);
  await expect(page.locator('[data-engine="phaser"] canvas')).toHaveCount(1);
  await page.getByRole("button", { name: "Start run", exact: true }).click();
  await page.getByRole("button", { name: "Reverse direction" }).click();
  await page.waitForTimeout(1100);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const before = (await page.locator(".stat-line").textContent()) ?? "";
  await page.waitForTimeout(600);
  await expect(page.locator(".stat-line")).toHaveText(before);
  await page.reload();
  await expect(page.getByRole("button", { name: "Resume", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Time well spent." })).toBeVisible({
    timeout: 50000,
  });
});
test("malformed and denied storage do not prevent play", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("fengi:progress:v1", "not json"));
  await page.goto(`/play/signal?mode=practice&seed=corrupt`);
  await expect(page.locator(".signal-board")).toBeVisible();
  await page.addInitScript(() =>
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new DOMException("denied", "SecurityError");
      },
    }),
  );
  await page.reload();
  await expect(page.getByRole("status").filter({ hasText: "progress" })).toBeVisible();
  await page.locator(".signal-tile:not([disabled])").first().click();
  await expect(page.locator(".signal-tile:not([disabled])").first()).toHaveAttribute(
    "data-state",
    "1",
  );
});
